import { type Page, expect, test } from '@playwright/test'
import { templateById } from '../src/lib/templates'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { dock, viewButton } from './support/shell'

/** Giro del plano en grados (0 = norte arriba, muros rectos), leído del grupo `data-floorplan-scene` de Pascal. */
const planRotation = (page: Page) =>
  page.evaluate(() => {
    const scene = document.querySelector('[data-floorplan-scene]')
    const match = /rotate\((-?[\d.]+)/.exec(scene?.getAttribute('transform') ?? '')
    return scene ? (match ? Number(match[1]) : 0) : Number.NaN
  })

test('el plano 2D entra recto (norte arriba) en 2D y en Ambas, aunque la cámara 3D esté en diagonal', async ({ page }) => {
  test.setTimeout(180_000)
  const store = templateById('concept-store') ?? templateById('loft')
  if (!store) throw new Error('Falta una plantilla')
  await createProjectViaUi(page, { name: `E2E plano recto ${Date.now()}`, kind: store.kind, template: store.name })
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  for (const view of ['2D', '3D', 'Ambas', '3D', '2D'] as const) {
    await viewButton(page, view).click()
    if (view === '3D') continue
    await expect.poll(async () => Math.abs(await planRotation(page)), { timeout: 15_000 }).toBeLessThan(0.5)
  }
})

test('el plano sigue recto aunque la persona gire la cámara 3D (Ambas y 2D)', async ({ page }) => {
  test.setTimeout(180_000)
  const store = templateById('concept-store') ?? templateById('loft')
  if (!store) throw new Error('Falta una plantilla')
  await createProjectViaUi(page, { name: `E2E plano girado ${Date.now()}`, kind: store.kind, template: store.name })
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  await viewButton(page, 'Ambas').click()
  await expect.poll(async () => Math.abs(await planRotation(page)), { timeout: 15_000 }).toBeLessThan(0.5)
  const azimuth = async () => {
    const pose = await hook(page, 'cameraPose')
    return pose ? Math.atan2((pose.position[0] ?? 0) - (pose.target[0] ?? 0), (pose.position[2] ?? 0) - (pose.target[2] ?? 0)) : Number.NaN
  }
  const before = await azimuth()
  for (let i = 0; i < 3; i++) {
    await hook(page, 'orbit', 'cw')
    await page.waitForTimeout(2500)
    expect(Math.abs(await planRotation(page)), `plano tras girar la cámara ${i + 1} vez`).toBeLessThan(0.5)
  }
  await expect.poll(azimuth, { timeout: 10_000 }).not.toBeCloseTo(before, 1)
  await viewButton(page, '2D').click()
  await page.waitForTimeout(1500)
  expect(Math.abs(await planRotation(page))).toBeLessThan(0.5)
})
