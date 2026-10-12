import { type Page, expect, test } from '@playwright/test'
import { ready } from './support/editor'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { undoRedo } from './support/shell'

type Json = Record<string, unknown>

const panel = (page: Page) => page.getByRole('complementary', { name: 'Propiedades' })
const field = (page: Page, label: string) => panel(page).getByLabel(label, { exact: true })
const nodeOf = async (page: Page, id: string) => (await hook(page, 'node', id)) as Json | null
const addVia = (name: 'addShelf' | 'addCabinet' | 'addStair' | 'addFlight') => async (page: Page) => (await hook(page, name)) as string

/** Escribe en un campo y lo confirma con Enter (así lo hace una persona). */
async function setField(page: Page, label: string, value: string) {
  const input = field(page, label)
  await input.fill(value)
  await input.press('Enter')
}

/** Espera a que termine el guardado de lo último: el chip pasa de "Guardado" a "Guardando…" y vuelve. */
async function waitSaved(page: Page) {
  const chip = page.getByTestId('save-status')
  await expect(chip).not.toHaveText('Guardado', { timeout: 10_000 })
  await expect(chip).toHaveText('Guardado', { timeout: 30_000 })
}

const CASES = [
  { name: 'estante (ancho)', add: addVia('addShelf'), label: 'Ancho', value: '2', read: (n: Json) => n.width, before: 1, after: 2 },
  { name: 'estante (filas)', add: addVia('addShelf'), label: 'Filas', value: '5', read: (n: Json) => n.rows, before: 3, after: 5 },
  { name: 'gabinete (fondo)', add: addVia('addCabinet'), label: 'Fondo', value: '0,5', read: (n: Json) => n.depth, before: 0.6, after: 0.5 },
  { name: 'escalera de caracol (escalones)', add: addVia('addStair'), label: 'Escalones', value: '14', read: (n: Json) => n.stepCount, before: 10, after: 14 },
  { name: 'tramo de escalera recta (ancho)', add: addVia('addFlight'), label: 'Ancho', value: '1,2', read: (n: Json) => n.width, before: 1, after: 1.2 },
]

for (const c of CASES) {
  test(`${c.name}: editar un campo cambia el nodo, se guarda y Deshacer lo revierte`, async ({ page }) => {
    const url = await createBlankProject(page, c.name)
    const id = await c.add(page)
    await waitSaved(page)
    await hook(page, 'select', id)
    await expect(panel(page)).toBeVisible({ timeout: 15_000 })
    const read = async () => c.read((await nodeOf(page, id)) ?? {})
    expect(await read()).toBe(c.before)

    await setField(page, c.label, c.value)
    await expect.poll(read).toBe(c.after)

    const { undo, redo } = undoRedo(page)
    await undo.click()
    await expect.poll(read).toBe(c.before)
    await redo.click()
    await expect.poll(read).toBe(c.after)

    await waitSaved(page)
    await page.goto(url)
    await ready(page)
    expect(await read()).toBe(c.after)
  })
}

test('un estante: lo fuera de rango se ajusta al límite y lo que no es un número se descarta', async ({ page }) => {
  await createBlankProject(page, 'límites del estante')
  const id = await addVia('addShelf')(page)
  await hook(page, 'select', id)
  await expect(field(page, 'Ancho')).toHaveValue('1,00 m', { timeout: 15_000 })

  await setField(page, 'Ancho', '10')
  await expect(field(page, 'Ancho')).toHaveValue('3,00 m')
  expect((await nodeOf(page, id))?.width).toBe(3)
  await setField(page, 'Filas', '20')
  await expect(field(page, 'Filas')).toHaveValue('8')
  await setField(page, 'Filas', 'muchas')
  await expect(field(page, 'Filas')).toHaveValue('8')
})

test('un estante: el interruptor Panel trasero cambia el nodo y Deshacer lo revierte', async ({ page }) => {
  await createBlankProject(page, 'interruptor')
  const id = await addVia('addShelf')(page)
  await hook(page, 'select', id)
  const back = field(page, 'Panel trasero')
  await expect(back).toHaveValue('yes', { timeout: 15_000 })
  await back.selectOption('no')
  await expect.poll(async () => (await nodeOf(page, id))?.withBack).toBe(false)
  await undoRedo(page).undo.click()
  await expect.poll(async () => (await nodeOf(page, id))?.withBack).toBe(true)
  await expect(back).toHaveValue('yes')
})

test('una escalera recta no se edita en el grupo: muestra sus tramos y pide elegir uno', async ({ page }) => {
  await createBlankProject(page, 'recta')
  const flightId = await addVia('addFlight')(page)
  const parentId = (await nodeOf(page, flightId))?.parentId as string
  await hook(page, 'select', parentId)
  await expect(panel(page).getByText('Tramos')).toBeVisible({ timeout: 15_000 })
  await expect(field(page, 'Ancho')).toHaveCount(0)
})
