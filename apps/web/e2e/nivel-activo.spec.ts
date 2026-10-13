import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { modeButton } from './support/shell'

const panel = (page: Page) => page.getByRole('complementary', { name: 'Nivel y ambientes' })
const pickLevel = async (page: Page, name: string) => {
  await panel(page).getByRole('button', { name: /Planta/ }).first().click()
  await panel(page).getByRole('list', { name: 'Plantas' }).getByRole('button', { name }).click()
}
const visibleLevels = async (page: Page) => (await hook(page, 'levels')).map((l) => l.visible)

test('siempre hay un nivel activo; si se borra el activo pasa al más cercano y nunca se ve el aviso en inglés', async ({ page }) => {
  test.setTimeout(180_000)
  await createProjectViaUi(page, { name: `E2E nivel activo ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  await expect(panel(page)).toBeVisible({ timeout: 15_000 })
  const [ground, upper] = await hook(page, 'levels')
  expect((await hook(page, 'state')).levelId).toBe(ground?.id)
  await pickLevel(page, 'Planta 1')
  await expect.poll(async () => (await hook(page, 'state')).levelId).toBe(upper?.id)
  await hook(page, 'deleteNode', upper?.id as string)
  await expect.poll(async () => (await hook(page, 'state')).levelId).toBe(ground?.id)
  expect(await page.locator('body').innerText()).not.toContain('Switch to a building level')
})

test('en Editar el 3D muestra la planta activa y las inferiores; en Ver queda libre', async ({ page }) => {
  test.setTimeout(180_000)
  await createProjectViaUi(page, { name: `E2E planta 3d ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  await expect(panel(page)).toBeVisible({ timeout: 15_000 })
  await expect.poll(() => visibleLevels(page), { timeout: 20_000 }).toEqual([true, false])
  await pickLevel(page, 'Planta 1')
  await expect.poll(() => visibleLevels(page), { timeout: 20_000 }).toEqual([true, true])
  await pickLevel(page, 'Planta baja')
  await expect.poll(() => visibleLevels(page), { timeout: 20_000 }).toEqual([true, false])
  await modeButton(page, 'Ver').click()
  await expect.poll(() => visibleLevels(page), { timeout: 20_000 }).toEqual([true, true])
})
