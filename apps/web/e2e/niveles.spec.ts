import { expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { modeButton } from './support/shell'

const ENGLISH = /Ground Floor|Floor \d|Basement|Zone \d/

test('las plantas sin nombre se ven como Planta baja y Planta 1; se cambia de planta y se crea una nueva', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E niveles ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  const panel = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  await expect(panel).toBeVisible({ timeout: 15_000 })
  const trigger = panel.getByRole('button', { name: /Planta/ }).first()
  await expect(trigger).toContainText('Planta baja')
  const before = (await hook(page, 'state')).levelId

  await trigger.click()
  const list = panel.getByRole('list', { name: 'Plantas' })
  await expect(list.getByRole('button', { name: /^(Planta|Sótano)/ })).toHaveText(['Planta baja', 'Planta 1'])
  await list.getByRole('button', { name: 'Planta 1' }).click()
  await expect(trigger).toContainText('Planta 1')
  expect((await hook(page, 'state')).levelId).not.toBe(before)

  await trigger.click()
  await panel.getByRole('button', { name: 'Agregar planta' }).dblclick() // un doble clic crea una sola
  await expect(trigger).toContainText('Planta 2', { timeout: 15_000 })
  await trigger.click()
  await expect(list.getByRole('button', { name: /^(Planta|Sótano)/ })).toHaveText(['Planta baja', 'Planta 1', 'Planta 2'])
  expect(await panel.innerText()).not.toMatch(ENGLISH)
})

test('los ambientes de la planta se listan con su superficie en m² y se pueden elegir', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E ambientes ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  const panel = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  const rooms = panel.getByRole('button', { pressed: false }).filter({ hasText: /m²/ })
  await expect(rooms.first()).toBeVisible({ timeout: 15_000 })
  expect(await rooms.count()).toBeGreaterThanOrEqual(2)
  for (const text of await rooms.allInnerTexts()) expect(text).toMatch(/\d+,\d m²/)
  await rooms.first().click()
  await expect(panel.getByRole('button', { pressed: true })).toHaveCount(1)
  expect((await hook(page, 'state')).zoneId).not.toBeNull()
  expect(await panel.innerText()).not.toMatch(ENGLISH)
})

test('un proyecto en blanco no tiene ambientes: la lista invita a dibujar uno; en Ver no se crean plantas', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E vacio ${Date.now()}`, template: null })
  const panel = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  await expect(panel.getByText('Todavía no hay ambientes. Marca uno con Estructura › Ambiente.')).toBeVisible({ timeout: 15_000 })
  await modeButton(page, 'Ver').click()
  await panel.getByRole('button', { name: /Planta/ }).first().click()
  await expect(panel.getByRole('button', { name: 'Agregar planta' })).toHaveCount(0)
})
