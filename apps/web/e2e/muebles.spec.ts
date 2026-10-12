import { expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { dockButton, modeButton } from './support/shell'

const ENGLISH = /\b(Sofa|Double Bed|Furniture|Search|Bathtub|Dining|Stool|Tree|Kitchen)\b/

test('Muebles abre el catálogo en castellano; elegir uno pasa a la fase furnish y arma el mueble; la búsqueda y las categorías filtran', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E muebles ${Date.now()}`, template: null })
  await dockButton(page, 'Muebles').click()
  const panel = page.getByRole('complementary', { name: 'Muebles' })
  await expect(panel).toBeVisible({ timeout: 15_000 })
  expect(await panel.innerText()).not.toMatch(ENGLISH)
  const cards = panel.getByRole('listitem')
  await expect(cards.first()).toBeVisible({ timeout: 15_000 })
  expect(await cards.count()).toBeGreaterThanOrEqual(100)

  await panel.getByRole('searchbox', { name: 'Buscar muebles' }).fill('cama')
  await expect(cards).toHaveCount(2)
  await expect(panel.getByRole('button', { name: /Cama doble/ })).toBeVisible()
  await panel.getByRole('searchbox', { name: 'Buscar muebles' }).fill('')
  await panel.getByRole('button', { name: 'Baño', exact: true }).click()
  await expect(cards).toHaveCount(10)

  await panel.getByRole('button', { name: 'Todos', exact: true }).click()
  await panel.getByRole('button', { name: /^Sofá/ }).click()
  expect(await hook(page, 'state')).toMatchObject({ phase: 'furnish', mode: 'build', tool: 'item' })
  await expect(panel.getByRole('button', { name: /^Sofá/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(dockButton(page, 'Muebles')).toHaveAttribute('aria-pressed', 'true')
})

test('las miniaturas del catálogo se ven (no quedan rotas)', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E miniaturas ${Date.now()}`, template: null })
  await dockButton(page, 'Muebles').click()
  const images = page.getByRole('complementary', { name: 'Muebles' }).locator('img')
  await expect(images.first()).toBeVisible({ timeout: 15_000 })
  await expect
    .poll(() => images.evaluateAll((list) => list.slice(0, 8).every((img) => (img as HTMLImageElement).naturalWidth > 0)), { timeout: 15_000 })
    .toBe(true)
})

test('al volver a Seleccionar o pasar a Ver el panel de muebles cede su lugar a las plantas y los ambientes', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E panel ${Date.now()}`, template: null })
  const furniture = page.getByRole('complementary', { name: 'Muebles' })
  const levels = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  await dockButton(page, 'Muebles').click()
  await expect(furniture).toBeVisible({ timeout: 15_000 })
  await expect(levels).toHaveCount(0)
  await dockButton(page, 'Seleccionar').click()
  await expect(levels).toBeVisible()
  await expect(furniture).toHaveCount(0)
  await dockButton(page, 'Muebles').click()
  await modeButton(page, 'Ver').click()
  await expect(levels).toBeVisible()
  await expect(furniture).toHaveCount(0)
})
