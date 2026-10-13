import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dockButton, modeButton } from './support/shell'

const ENGLISH = /\b(Wood|Floor|Plank|Parquet|Tiles?|White|Black|Brick|Stone|Glass|Linen|Leather|Concrete|Shingles|Steel)\b/

const paintMaterial = async (page: Page) => (await hook(page, 'state')).paintMaterial

test('Materiales abre el panel en castellano; elegir una muestra arma la pintura con ese material', async ({ page }) => {
  await createBlankProject(page, 'materiales')
  await dockButton(page, 'Materiales').click()
  const panel = page.getByRole('complementary', { name: 'Materiales' })
  await expect(panel).toBeVisible({ timeout: 15_000 })
  expect(await hook(page, 'state')).toMatchObject({ mode: 'material-paint', tool: null, paintMaterial: null })
  expect(await panel.innerText()).not.toMatch(ENGLISH)
  const wood = panel.getByRole('button', { name: 'Madera fina 1', exact: true })
  await wood.click()
  await expect.poll(() => paintMaterial(page)).toBe('library:wood-woodfine1')
  await expect(wood).toHaveAttribute('aria-pressed', 'true')
  await expect(dockButton(page, 'Materiales')).toHaveAttribute('aria-pressed', 'true')
})

test('cada superficie parte de su categoría: Muros en Colores, Techo en Techos', async ({ page }) => {
  await createBlankProject(page, 'superficies')
  await dockButton(page, 'Materiales').click()
  const panel = page.getByRole('complementary', { name: 'Materiales' })
  await expect(panel.getByRole('button', { name: 'Madera', exact: true })).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  await panel.getByRole('button', { name: 'Muros', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Colores', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await panel.getByRole('button', { name: 'Blanco', exact: true }).click()
  await expect.poll(() => paintMaterial(page)).toBe('library:preset-white')
  await panel.getByRole('button', { name: 'Techo', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Techos', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByRole('button', { name: 'Tejas de arcilla', exact: true })).toBeVisible()
})

test('al volver a Seleccionar o pasar a Ver el panel de materiales cede su lugar a las plantas y los ambientes', async ({ page }) => {
  await createBlankProject(page, 'panel materiales')
  const materials = page.getByRole('complementary', { name: 'Materiales' })
  const levels = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  await dockButton(page, 'Materiales').click()
  await expect(materials).toBeVisible({ timeout: 15_000 })
  await expect(levels).toHaveCount(0)
  await dockButton(page, 'Seleccionar').click()
  await expect(levels).toBeVisible()
  await expect(materials).toHaveCount(0)
  await dockButton(page, 'Materiales').click()
  await modeButton(page, 'Ver').click()
  await expect(levels).toBeVisible()
  await expect(materials).toHaveCount(0)
})
