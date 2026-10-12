import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createBlankProject, createProjectViaUi } from './support/projects'
import { dockButton, undoRedo } from './support/shell'

type Json = Record<string, unknown>

const furniture = (page: Page) => page.getByRole('complementary', { name: 'Muebles' })
const count = async (page: Page, type: string) => ((await hook(page, 'counts'))[type] ?? 0) as number
const only = async (page: Page, type: string) => ((await hook(page, 'nodesOf', type)) as Json[])[0]

/** La herramienta de Pascal se carga bajo demanda: se espera a que esté montada antes de hacer clic en el suelo. */
const place = async (page: Page, x: number, z: number) => {
  await page.waitForTimeout(2500)
  await hook(page, 'placeAt', x, z)
}

async function pickCard(page: Page, group: 'Estantes' | 'Gabinetes', name: string) {
  await dockButton(page, 'Muebles').click()
  await expect(furniture(page)).toBeVisible({ timeout: 15_000 })
  await furniture(page).getByRole('group', { name: group }).getByRole('button', { name }).click()
}

test('"A medida": Cubículos crea un estante cubby con un clic y Deshacer lo quita de una vez', async ({ page }) => {
  test.setTimeout(150_000)
  await createBlankProject(page, 'a medida cubiculos')
  await pickCard(page, 'Estantes', 'Cubículos')
  expect(await hook(page, 'state')).toMatchObject({ phase: 'furnish', mode: 'build', tool: 'shelf' })
  await place(page, 2, 2)
  await expect.poll(() => count(page, 'shelf')).toBe(1)
  expect((await only(page, 'shelf'))?.style).toBe('cubby')
  await undoRedo(page).undo.click()
  await expect.poll(() => count(page, 'shelf')).toBe(0)
})

test('"A medida": Biblioteca y Repisa de pared colocan el estilo elegido y un solo Deshacer los quita', async ({ page }) => {
  test.setTimeout(150_000)
  await createBlankProject(page, 'a medida estantes')
  await pickCard(page, 'Estantes', 'Biblioteca')
  await place(page, 2, 2)
  await expect.poll(() => count(page, 'shelf')).toBe(1)
  expect(await only(page, 'shelf')).toMatchObject({ style: 'bookshelf', rows: 4, columns: 2 })
  await undoRedo(page).undo.click()
  await expect.poll(() => count(page, 'shelf')).toBe(0)

  await pickCard(page, 'Estantes', 'Repisa de pared')
  await place(page, 3, 3)
  await expect.poll(() => count(page, 'shelf')).toBe(1)
  expect(await only(page, 'shelf')).toMatchObject({ style: 'wall-shelf', rows: 1 })
})

test('"A medida": Heladera coloca un gabinete con su módulo de heladera', async ({ page }) => {
  test.setTimeout(150_000)
  await createBlankProject(page, 'a medida gabinete')
  await pickCard(page, 'Gabinetes', 'Heladera')
  await place(page, 2, 2)
  await expect.poll(() => count(page, 'cabinet-module')).toBeGreaterThan(0)
  const module = await only(page, 'cabinet-module')
  const stack = (module?.stack ?? []) as { type: string }[]
  expect(stack[0]?.type).toBe('fridge-single')
  expect(await count(page, 'cabinet')).toBe(1)
  await undoRedo(page).undo.click()
  await expect.poll(() => count(page, 'cabinet-module')).toBe(0)
})

test('la ficha del estante tiene el Estilo editable y el cambio entra al historial', async ({ page }) => {
  test.setTimeout(150_000)
  await createBlankProject(page, 'estilo editable')
  const id = (await hook(page, 'addShelf')) as string
  await hook(page, 'select', id)
  const panel = page.getByRole('complementary', { name: 'Propiedades' })
  const style = panel.getByLabel('Estilo', { exact: true })
  await expect(style).toBeVisible({ timeout: 15_000 })
  await style.selectOption('open-rack')
  await expect.poll(async () => ((await hook(page, 'node', id)) as Json | null)?.style).toBe('open-rack')
  await undoRedo(page).undo.click()
  await expect.poll(async () => ((await hook(page, 'node', id)) as Json | null)?.style).toBe('bookshelf')
})

test('Estructura ofrece las tres escaleras y Escalera caracol coloca una escalera de caracol', async ({ page }) => {
  test.setTimeout(150_000)
  await createProjectViaUi(page, { name: `E2E escaleras ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  await dockButton(page, 'Estructura').click()
  const menu = page.getByRole('menu', { name: 'Estructura' })
  for (const name of ['Escalera recta', 'Escalera curva', 'Escalera caracol']) await expect(menu.getByRole('menuitem', { name })).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Escalera caracol' }).click()
  expect(await hook(page, 'state')).toMatchObject({ phase: 'structure', mode: 'build', tool: 'stair' })
  const before = await count(page, 'stair')
  await place(page, 6, 5)
  await expect.poll(() => count(page, 'stair')).toBe(before + 1)
  const stairs = (await hook(page, 'nodesOf', 'stair')) as Json[]
  expect(stairs.some((s) => s.stairType === 'spiral')).toBe(true)
})
