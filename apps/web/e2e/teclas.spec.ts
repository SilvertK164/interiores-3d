import { type Page, expect, test } from '@playwright/test'
import { counts } from './support/editor'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dockButton, modeButton, undoRedo } from './support/shell'

const walls = async (page: Page) => (await counts(page)).wall ?? 0
const panel = (page: Page) => page.getByRole('complementary', { name: 'Propiedades' })
/** Quien acaba de hacer clic en el lienzo deja el foco en `body`, fuera del shell. */
const focusCanvas = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
const focusIsInShell = (page: Page) => page.evaluate(() => Boolean(document.activeElement?.closest('[data-editor-shell]')))

/** Un proyecto en blanco con un muro y "Seleccionar" armado; el clic en el dock deja el foco en un botón del shell. */
async function withWall(page: Page, label: string) {
  await createBlankProject(page, label)
  await expect(dockButton(page, 'Seleccionar')).toBeVisible({ timeout: 15_000 })
  await hook(page, 'addWall')
  await dockButton(page, 'Seleccionar').click()
  await expect.poll(async () => (await hook(page, 'state')).tool).toBeNull()
  expect(await focusIsInShell(page)).toBe(true)
}

test('en Ver, Ctrl+Z y Ctrl+Mayús+Z no tocan la escena, ni con el foco en el shell ni con el foco en el lienzo', async ({ page }) => {
  await withWall(page, 'ver-deshacer')
  await hook(page, 'addWall')
  await undoRedo(page).undo.click() // un paso hecho y otro deshecho: hay algo que deshacer y algo que rehacer
  await expect.poll(() => walls(page)).toBe(1)
  const before = await counts(page)
  expect(await hook(page, 'state')).toMatchObject({ canUndo: true, canRedo: true })
  await modeButton(page, 'Ver').click()
  await expect(modeButton(page, 'Ver')).toHaveAttribute('aria-pressed', 'true')
  for (const where of ['shell', 'canvas'] as const) {
    if (where === 'canvas') await focusCanvas(page)
    expect(await focusIsInShell(page), where).toBe(where === 'shell')
    // Una tecla por vez: deshacer y rehacer seguidos se anulan entre sí y taparían que Pascal deshizo.
    for (const chord of ['Control+z', 'Control+Shift+z']) {
      await page.keyboard.press(chord)
      expect(await counts(page), `${where} ${chord}`).toEqual(before)
    }
  }
  expect(await hook(page, 'state')).toMatchObject({ canUndo: true, canRedo: true })
})

test('en Editar, Ctrl+Z con el foco en un botón del shell sí deshace y Ctrl+Mayús+Z rehace', async ({ page }) => {
  await withWall(page, 'editar-deshacer')
  const before = await walls(page)
  await page.keyboard.press('Control+z')
  await expect.poll(() => walls(page)).toBe(before - 1)
  await page.keyboard.press('Control+Shift+z')
  await expect.poll(() => walls(page)).toBe(before)
})

test('en Editar, Supr y Retroceso con el foco en un botón del shell no borran la selección; con el foco en el lienzo, sí', async ({ page }) => {
  await withWall(page, 'supr')
  const id = (await hook(page, 'selectFirstWall')) as string
  await expect(panel(page)).toBeVisible()
  const before = await walls(page)
  await panel(page).getByRole('button', { name: 'Duplicar' }).focus()
  expect(await focusIsInShell(page)).toBe(true)
  for (const key of ['Delete', 'Backspace']) await page.keyboard.press(key)
  expect(await walls(page)).toBe(before)
  expect(await hook(page, 'node', id)).not.toBeNull()
  await focusCanvas(page)
  await page.keyboard.press('Delete')
  await expect.poll(() => walls(page)).toBe(before - 1)
})

test('Supr y Retroceso dentro de un campo de la ficha editan el número y no borran el elemento', async ({ page }) => {
  await withWall(page, 'campo')
  await hook(page, 'selectFirstWall')
  const before = await walls(page)
  const height = panel(page).getByLabel('Alto', { exact: true })
  await height.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Backspace')
  await expect(height).toHaveValue('')
  await page.keyboard.press('Delete')
  expect(await walls(page)).toBe(before)
})

test('en Editar, las teclas de herramienta con el foco en un botón del shell no arman nada; con el foco en el lienzo, sí', async ({ page }) => {
  await withWall(page, 'herramienta')
  const idle = await hook(page, 'state')
  for (const key of ['b', 'x', 'p', 'z', '1']) await page.keyboard.press(key)
  expect(await hook(page, 'state')).toMatchObject({ mode: idle.mode, tool: idle.tool, phase: idle.phase })
  await focusCanvas(page)
  await page.keyboard.press('b')
  await expect.poll(async () => (await hook(page, 'state')).tool).toBe('wall')
})

test('Espacio y Enter siguen activando los botones del shell aunque el shell frene esas teclas', async ({ page }) => {
  await createBlankProject(page, 'espacio')
  await expect(modeButton(page, 'Ver')).toBeVisible({ timeout: 15_000 })
  await modeButton(page, 'Ver').focus()
  await page.keyboard.press('Space')
  await expect(modeButton(page, 'Ver')).toHaveAttribute('aria-pressed', 'true')
  await modeButton(page, 'Editar').focus()
  await page.keyboard.press('Enter')
  await expect(modeButton(page, 'Editar')).toHaveAttribute('aria-pressed', 'true')
})
