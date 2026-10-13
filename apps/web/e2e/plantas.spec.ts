import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { modeButton, undoRedo } from './support/shell'

type Json = Record<string, unknown>

const panel = (page: Page) => page.getByRole('complementary', { name: 'Nivel y ambientes' })
const list = (page: Page) => panel(page).getByRole('list', { name: 'Plantas' })
const levels = (page: Page) => hook(page, 'levels') as Promise<{ id: string; level: number }[]>
const nodeOf = async (page: Page, id: string) => (await hook(page, 'node', id)) as Json | null

/** Abre el selector de plantas y el menú "…" de la fila `index` (0 = la de más abajo). */
async function openMenu(page: Page, index: number) {
  if (!(await list(page).isVisible())) await panel(page).getByRole('button', { name: /Planta|Elige|Sin/ }).first().click()
  await list(page).getByRole('listitem').nth(index).getByRole('button', { name: 'Opciones de la planta' }).click()
}
const action = (page: Page, name: string | RegExp) => list(page).getByRole('button', { name })

async function openLoft(page: Page) {
  await createProjectViaUi(page, { name: `E2E plantas ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  await expect(panel(page)).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1500)
}

test('renombrar una planta: se guarda, Esc cancela, vacío no se admite y Deshacer la devuelve', async ({ page }) => {
  test.setTimeout(150_000)
  await openLoft(page)
  await openMenu(page, 0)
  await action(page, 'Renombrar').click()
  const field = list(page).getByLabel('Nombre de la planta')
  await field.press('Escape') // cancela y vuelve al menú
  await expect(action(page, 'Renombrar')).toBeVisible()
  await action(page, 'Renombrar').click()
  await field.fill('   ')
  await field.press('Enter')
  await expect(list(page).getByRole('alert')).toHaveText('El nombre no puede quedar vacío.')
  await field.fill('Planta principal')
  await field.press('Enter')
  await expect(panel(page).getByRole('button', { name: /Planta principal/ }).first()).toBeVisible()
  const ground = (await levels(page))[0]?.id as string
  expect((await nodeOf(page, ground))?.name).toBe('Planta principal')
  await undoRedo(page).undo.click()
  await expect.poll(async () => (await nodeOf(page, ground))?.name ?? null).not.toBe('Planta principal')
})

test('altura de la planta: 3,6 a 3,0 m ajusta la escalera y Deshacer vuelve a 3,6', async ({ page }) => {
  test.setTimeout(150_000)
  await openLoft(page)
  const ground = (await levels(page))[0]?.id as string
  expect((await nodeOf(page, ground))?.height).toBe(3.6)
  const rise = async () => {
    const segments = (await hook(page, 'nodesOf', 'stair-segment')) as { height?: number }[]
    return segments.reduce((sum, s) => sum + (s.height ?? 0), 0)
  }
  const before = await rise()
  await openMenu(page, 0)
  await action(page, /^Altura/).click()
  const field = list(page).getByLabel('Altura (m)')
  await field.fill('abc')
  await field.press('Enter')
  await expect(list(page).getByRole('alert')).toContainText('Escribe la altura en metros')
  await field.fill('3,0')
  await field.press('Enter')
  await expect.poll(async () => (await nodeOf(page, ground))?.height).toBe(3)
  await expect.poll(rise, { message: 'la escalera sigue la altura de la planta' }).toBeLessThan(before - 0.3)
  await undoRedo(page).undo.click()
  await expect.poll(async () => (await nodeOf(page, ground))?.height).toBe(3.6)
  await expect.poll(rise).toBeCloseTo(before, 1)
})

test('subir y bajar de orden intercambia las plantas; la de arriba no sube más', async ({ page }) => {
  test.setTimeout(150_000)
  await openLoft(page)
  const [a, b] = await levels(page)
  await openMenu(page, 0)
  await expect(action(page, 'Bajar de orden')).toBeDisabled()
  await action(page, 'Subir de orden').click()
  await expect.poll(async () => (await levels(page)).map((l) => l.id)).toEqual([b?.id, a?.id])
  // El menú sigue abierto sobre la misma planta, que ahora es la de más arriba.
  await expect(action(page, 'Subir de orden')).toBeDisabled()
  await expect(action(page, 'Bajar de orden')).toBeEnabled()
})

test('eliminar: pide confirmación con lo que se pierde, deja la escalera sin referencias rotas, Deshacer la restaura y la última no se borra', async ({ page }) => {
  test.setTimeout(180_000)
  await openLoft(page)
  const [ground, upper] = await levels(page)
  const stair = ((await hook(page, 'nodesOf', 'stair')) as Json[])[0] as Json
  expect(stair.toLevelId).toBe(upper?.id)
  // La planta activa es la baja: se borra la baja y la activa pasa a la que queda.
  await openMenu(page, 0)
  await action(page, /^Eliminar…/).click()
  await expect(list(page).getByText(/^Se borrarán \d+ ambientes y \d+ elementos\.$/)).toBeVisible()
  await list(page).getByRole('button', { name: 'Cancelar' }).click()
  expect((await levels(page)).length).toBe(2)
  await action(page, /^Eliminar…/).click()
  await list(page).getByRole('button', { name: 'Eliminar planta' }).dblclick() // un doble clic borra una sola vez
  await expect.poll(async () => (await levels(page)).map((l) => l.id)).toEqual([upper?.id])
  await expect.poll(async () => (await hook(page, 'state')).levelId).toBe(upper?.id)

  // La última planta no se puede borrar.
  await openMenu(page, 0)
  await action(page, /^Eliminar…/).click()
  await expect(list(page).getByRole('button', { name: 'Eliminar planta' })).toBeDisabled()
  await expect(list(page).getByText('No se puede eliminar la única planta del proyecto.')).toBeVisible()
  await list(page).getByRole('button', { name: 'Cancelar' }).click()

  // Deshacer restaura la planta con todo lo suyo.
  await undoRedo(page).undo.click()
  await expect.poll(async () => (await levels(page)).map((l) => l.id)).toEqual([ground?.id, upper?.id])
  await expect.poll(async () => ((await hook(page, 'nodesOf', 'stair')) as Json[]).length).toBeGreaterThan(0)
  expect(((await hook(page, 'nodesOf', 'wall')) as Json[]).length).toBeGreaterThan(5)
})

test('borrar la planta de arriba deja la escalera de abajo sin destino roto', async ({ page }) => {
  test.setTimeout(150_000)
  await openLoft(page)
  const [, upper] = await levels(page)
  await openMenu(page, 1)
  await action(page, /^Eliminar…/).click()
  await list(page).getByRole('button', { name: 'Eliminar planta' }).click()
  await expect.poll(async () => (await levels(page)).length).toBe(1)
  const stair = ((await hook(page, 'nodesOf', 'stair')) as Json[])[0] as Json
  expect(stair.toLevelId).not.toBe(upper?.id)
  await undoRedo(page).undo.click()
  await expect.poll(async () => (await levels(page)).length).toBe(2)
  await expect.poll(async () => (((await hook(page, 'nodesOf', 'stair')) as Json[])[0] as Json).toLevelId).toBe(upper?.id)
})

test('duplicar copia la planta con ambientes y muros, queda activa y se llama "(copia)"', async ({ page }) => {
  test.setTimeout(150_000)
  await openLoft(page)
  const wallsBefore = ((await hook(page, 'nodesOf', 'wall')) as Json[]).length
  const zonesBefore = ((await hook(page, 'nodesOf', 'zone')) as Json[]).length
  await openMenu(page, 0)
  await action(page, 'Duplicar').dblclick() // un doble clic crea una sola copia
  await expect.poll(async () => (await levels(page)).length).toBe(3)
  const copy = (await levels(page))[1] as { id: string }
  expect((await hook(page, 'state')).levelId).toBe(copy.id)
  expect(String((await nodeOf(page, copy.id))?.name)).toContain('(copia)')
  expect(((await hook(page, 'nodesOf', 'wall')) as Json[]).length).toBeGreaterThan(wallsBefore)
  expect(((await hook(page, 'nodesOf', 'zone')) as Json[]).length).toBeGreaterThan(zonesBefore)
})

test('agregar planta la deja activa con nombre en castellano; en Ver no hay menú de plantas', async ({ page }) => {
  test.setTimeout(150_000)
  await openLoft(page)
  await panel(page).getByRole('button', { name: /Planta/ }).first().click()
  await panel(page).getByRole('button', { name: 'Agregar planta' }).click()
  await expect(panel(page).getByRole('button', { name: /Planta 2/ }).first()).toBeVisible({ timeout: 15_000 })
  const all = await levels(page)
  expect((await hook(page, 'state')).levelId).toBe(all.at(-1)?.id)
  await modeButton(page, 'Ver').click()
  await panel(page).getByRole('button', { name: /Planta/ }).first().click()
  await expect(list(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Opciones de la planta' })).toHaveCount(0)
})
