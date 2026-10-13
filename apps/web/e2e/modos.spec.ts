import { type Page, expect, test } from '@playwright/test'
import { counts, ready } from './support/editor'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { modeButton, undoRedo, viewButton } from './support/shell'
import { luminanceOf } from './support/theme'

const walls = async (page: Page) => (await counts(page)).wall ?? 0

test('abre en Editar con el nombre del proyecto, el chip de guardado y la barra de Madori', async ({ page }) => {
  await createBlankProject(page, 'barra')
  await expect(modeButton(page, 'Editar')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  await expect(modeButton(page, 'Ver')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('heading', { level: 1, name: /E2E barra/ })).toBeVisible()
  await expect(page.getByTestId('save-status')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Volver a mis proyectos' })).toBeEnabled()
})

test('Ver con la herramienta de muro armada (proyecto en blanco) la desarma, bloquea la escena y esconde el historial; Editar no la rearma', async ({ page }) => {
  await createBlankProject(page, 'ver')
  await expect(modeButton(page, 'Editar')).toBeVisible({ timeout: 15_000 })
  // Pascal abre un proyecto en blanco con la herramienta de muro ya armada: el shell no puede suponer "Seleccionar".
  await expect.poll(async () => (await hook(page, 'state')).tool, { timeout: 15_000 }).toBe('wall')

  await modeButton(page, 'Ver').click()
  await expect(modeButton(page, 'Ver')).toHaveAttribute('aria-pressed', 'true')
  expect(await hook(page, 'state')).toMatchObject({ readOnly: true, mode: 'select', tool: null })
  await expect(undoRedo(page).group).toHaveCount(0)

  await modeButton(page, 'Editar').click()
  expect(await hook(page, 'state')).toMatchObject({ readOnly: false, mode: 'select', tool: null })
  await expect(undoRedo(page).group).toBeVisible()
})

test('en Ver, Supr, Retroceso y las teclas de herramienta no cambian la escena', async ({ page }) => {
  await createBlankProject(page, 'teclas')
  await expect(modeButton(page, 'Ver')).toBeVisible({ timeout: 15_000 })
  await hook(page, 'addWall')
  await hook(page, 'selectFirstWall')
  const before = await counts(page)
  await modeButton(page, 'Ver').click()
  expect((await hook(page, 'state')).selectedIds).toEqual([]) // Ver limpia la selección
  // Ctrl+Z no está en la lista a propósito: el historial de Pascal no mira el solo lectura y lo frena el shell (Tarea 11b).
  for (const key of ['Delete', 'Backspace', 'x', 'b']) await page.keyboard.press(key)
  expect(await counts(page)).toEqual(before)
})

test('2D / 3D / Ambas cambia la vista de Pascal y se conserva al recargar', async ({ page }) => {
  const url = await createBlankProject(page, 'vista')
  await viewButton(page, '2D').click()
  await expect.poll(async () => (await hook(page, 'state')).viewMode).toBe('2d')
  await viewButton(page, 'Ambas').click()
  await expect.poll(async () => (await hook(page, 'state')).viewMode).toBe('split')
  await page.goto(url)
  await ready(page)
  await expect(viewButton(page, 'Ambas')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  expect((await hook(page, 'state')).viewMode).toBe('split')
  await viewButton(page, '3D').click()
  await expect.poll(async () => (await hook(page, 'state')).viewMode).toBe('3d')
})

test('Deshacer y Rehacer se habilitan y deshabilitan solos según el historial real', async ({ page }) => {
  await createBlankProject(page, 'historial')
  const { undo, redo } = undoRedo(page)
  await expect(undo).toBeDisabled({ timeout: 15_000 })
  await expect(redo).toBeDisabled()
  const before = await walls(page)
  await hook(page, 'addWall')
  await expect(undo).toBeEnabled()
  expect(await walls(page)).toBe(before + 1)
  await undo.click()
  await expect.poll(() => walls(page)).toBe(before)
  await expect(redo).toBeEnabled()
  await redo.click()
  await expect.poll(() => walls(page)).toBe(before + 1)
})

test('recargar estando en Ver abre en Editar y la escena se puede editar', async ({ page }) => {
  const url = await createBlankProject(page, 'recarga')
  await modeButton(page, 'Ver').click()
  await page.goto(url)
  await ready(page)
  await expect(modeButton(page, 'Editar')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  expect((await hook(page, 'state')).readOnly).toBe(false)
  const before = await walls(page)
  await hook(page, 'addWall')
  expect(await walls(page)).toBe(before + 1)
})

test('ninguna pieza flotante del shell tiene fondo oscuro aunque Pascal ponga body.dark', async ({ page }) => {
  await createBlankProject(page, 'luz')
  await expect(modeButton(page, 'Editar')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('body')).toHaveClass(/\bdark\b/)
  const colors = await page.evaluate(() =>
    [...document.querySelectorAll('[data-editor-shell] .shell-float')].map((el) => getComputedStyle(el).backgroundColor),
  )
  expect(colors.length).toBeGreaterThanOrEqual(3)
  for (const color of colors) expect(luminanceOf(color) ?? 1, color).toBeGreaterThanOrEqual(0.6)
})
