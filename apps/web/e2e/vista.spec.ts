import { type Page, expect, test } from '@playwright/test'
import { DECISIONS } from '../src/editor/shell/decisions'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { modeButton } from './support/shell'

type Row = [label: string, key: 'wallMode' | 'levelMode' | 'cameraMode' | 'shading', value: string]

const panel = (page: Page) => page.getByRole('complementary', { name: 'Vista 3D' })
const bar = (page: Page) => page.getByRole('toolbar', { name: 'Cámara' })
const toView = async (page: Page) => {
  await expect(modeButton(page, 'Ver')).toBeVisible({ timeout: 15_000 })
  await modeButton(page, 'Ver').click()
  await expect(panel(page)).toBeVisible()
}
/** Dónde está la cámara de Pascal y qué mira, como números (0 si faltan), o `null` si todavía no publicó ninguna. */
const camera = async (page: Page) => {
  const pose = await hook(page, 'cameraPose')
  if (!pose) return null
  const [px = 0, py = 0, pz = 0] = pose.position
  const [tx = 0, ty = 0, tz = 0] = pose.target
  return { px, py, pz, tx, ty, tz }
}
/** Ángulo de la cámara alrededor del punto que mira (azimut), en radianes. */
const azimuth = async (page: Page) => {
  const c = await camera(page)
  return c ? Math.atan2(c.pz - c.tz, c.px - c.tx) : Number.NaN
}

test('en Ver aparecen la Vista 3D y la barra de cámara; están Exportar imagen 3D y Exportar plano, sin Compartir ni Renderizar; en Editar no', async ({ page }) => {
  await createBlankProject(page, 'vista')
  await toView(page)
  await expect(bar(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Exportar imagen 3D' })).toBeEnabled()
  for (const name of ['Compartir', 'Renderizar']) await expect(page.getByRole('button', { name })).toHaveCount(0)
  await modeButton(page, 'Editar').click()
  await expect(panel(page)).toHaveCount(0)
  await expect(bar(page)).toHaveCount(0)
})

test('Muros, Niveles, Cámara y Estilo cambian lo que Pascal usa y la opción elegida queda marcada', async ({ page }) => {
  await createBlankProject(page, 'opciones')
  await toView(page)
  const cameraRows: Row[] = DECISIONS.cameraControl ? [['Isométrica', 'cameraMode', 'orthographic'], ['Perspectiva', 'cameraMode', 'perspective']] : []
  const styleRows: Row[] = DECISIONS.styleControl ? [['Realista', 'shading', 'rendered'], ['Sólido', 'shading', 'solid']] : []
  const table: Row[] = [
    ['Cortados', 'wallMode', 'cutaway'],
    ['Bajos', 'wallMode', 'down'],
    ['Completos', 'wallMode', 'up'],
    ['Separados', 'levelMode', 'exploded'],
    ['Uno solo', 'levelMode', 'solo'],
    ['Juntos', 'levelMode', 'stacked'],
    ...cameraRows,
    ...styleRows,
  ]
  for (const [label, key, value] of table) {
    const chip = panel(page).getByRole('button', { name: label, exact: true })
    await chip.click()
    await expect.poll(async () => (await hook(page, 'state'))[key], { message: label }).toBe(value)
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
  }
})

test('Girar y Vista superior mueven la cámara de Pascal', async ({ page }) => {
  await createBlankProject(page, 'camara')
  await toView(page)
  await expect.poll(() => azimuth(page), { timeout: 15_000 }).not.toBeNaN()
  const start = await azimuth(page)
  await bar(page).getByRole('button', { name: 'Girar izq.' }).click()
  await expect.poll(() => azimuth(page)).not.toBeCloseTo(start, 1)
  await bar(page).getByRole('button', { name: 'Vista superior' }).click()
  await expect
    .poll(async () => {
      const c = await camera(page)
      return c !== null && c.py > c.ty && Math.hypot(c.px - c.tx, c.pz - c.tz) < 0.5
    })
    .toBe(true)
})

test('Recorrer pasa a primera persona, deja solo el aviso y Esc devuelve el panel', async ({ page }) => {
  test.skip(!DECISIONS.walkthrough, 'El spike de la Tarea 0b no confirmó el puntero bloqueado: el botón Recorrer no se ofrece.')
  await createBlankProject(page, 'recorrer')
  await toView(page)
  await bar(page).getByRole('button', { name: 'Recorrer' }).click()
  await expect.poll(async () => (await hook(page, 'state')).firstPerson, { timeout: 15_000 }).toBe(true)
  await expect(page.getByText('Recorriendo el proyecto. Muévete con W A S D, mira con el ratón y pulsa Esc para volver.')).toBeVisible()
  await expect(panel(page)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect.poll(async () => (await hook(page, 'state')).firstPerson).toBe(false)
  await expect(panel(page)).toBeVisible()
})
