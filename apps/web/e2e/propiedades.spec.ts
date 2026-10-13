import { type Page, expect, test } from '@playwright/test'
import { counts, ready } from './support/editor'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { undoRedo } from './support/shell'

type Json = Record<string, unknown>

const panel = (page: Page) => page.getByRole('complementary', { name: 'Propiedades' })
const field = (page: Page, label: string) => panel(page).getByLabel(label, { exact: true })
const nodeOf = async (page: Page, id: string) => (await hook(page, 'node', id)) as Json | null
const selected = async (page: Page) => (await hook(page, 'state')).selectedIds

/** Escribe en un campo y lo confirma con Enter (así lo hace una persona). */
async function setField(page: Page, label: string, value: string) {
  const input = field(page, label)
  await input.fill(value)
  await input.press('Enter')
}

/** Espera a que el guardado de lo último termine: el chip pasa de "Guardado" a "Guardando…" y vuelve. */
async function waitSaved(page: Page) {
  const chip = page.getByTestId('save-status')
  await expect(chip).not.toHaveText('Guardado', { timeout: 10_000 })
  await expect(chip).toHaveText('Guardado', { timeout: 30_000 })
}

const withWall = async (page: Page) => {
  await hook(page, 'addWall')
}

type Case = {
  name: string
  add(page: Page): Promise<string>
  label: string
  value: string
  read(node: Json): unknown
  before: unknown
  after: unknown
}
const yaw = (node: Json) => Math.round(((node.rotation as number[] | undefined)?.[1] ?? 0) * 1000) / 1000

const CASES: Case[] = [
  { name: 'muro', add: async (page) => { await withWall(page); return (await hook(page, 'selectFirstWall')) as string }, label: 'Alto', value: '3', read: (n) => n.height, before: undefined, after: 3 },
  { name: 'puerta', add: async (page) => { await withWall(page); return (await hook(page, 'addDoor')) as string }, label: 'Ancho', value: '1', read: (n) => n.width, before: 0.9, after: 1 },
  { name: 'ventana', add: async (page) => { await withWall(page); return (await hook(page, 'addWindow')) as string }, label: 'Ancho', value: '2', read: (n) => n.width, before: 1.5, after: 2 },
  { name: 'mueble', add: async (page) => (await hook(page, 'addItem')) as string, label: 'Giro', value: '90', read: yaw, before: 0, after: 1.571 },
  { name: 'ambiente', add: async (page) => (await hook(page, 'addZone')) as string, label: 'Nombre', value: 'Cocina', read: (n) => n.name, before: 'Zone 1', after: 'Cocina' },
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

test('las medidas se escriben en metros con coma; lo que no es un número se descarta y lo fuera de rango se ajusta', async ({ page }) => {
  await createBlankProject(page, 'medidas')
  await withWall(page)
  const id = (await hook(page, 'addDoor')) as string
  await hook(page, 'select', id)
  const width = field(page, 'Ancho')
  await expect(width).toHaveValue('0,90 m', { timeout: 15_000 })

  await setField(page, 'Ancho', 'abc')
  await expect(width).toHaveValue('0,90 m')
  expect((await nodeOf(page, id))?.width).toBe(0.9)

  await setField(page, 'Ancho', '1,2')
  await expect(width).toHaveValue('1,20 m')
  await setField(page, 'Ancho', '10')
  await expect(width).toHaveValue('3,00 m')
  await setField(page, 'Ancho', '40 cm')
  await expect(width).toHaveValue('0,50 m')
})

test('Duplicar crea una sola copia aunque se haga doble clic, la deja elegida y Deshacer la quita', async ({ page }) => {
  await createBlankProject(page, 'duplicar')
  const id = (await hook(page, 'addItem')) as string
  await hook(page, 'select', id)
  const before = (await counts(page)).item ?? 0
  await panel(page).getByRole('button', { name: 'Duplicar' }).dblclick()
  await expect.poll(async () => (await counts(page)).item).toBe(before + 1)
  const ids = await selected(page)
  expect(ids).toHaveLength(1)
  expect(ids[0]).not.toBe(id)
  await undoRedo(page).undo.click()
  await expect.poll(async () => (await counts(page)).item ?? 0).toBe(before)
})

test('duplicar un muro copia también su puerta, y la puerta nueva apunta al muro nuevo', async ({ page }) => {
  await createBlankProject(page, 'copia de muro')
  await withWall(page)
  const doorId = (await hook(page, 'addDoor')) as string
  const wallId = (await hook(page, 'selectFirstWall')) as string
  await panel(page).getByRole('button', { name: 'Duplicar' }).click()
  await expect.poll(async () => (await counts(page)).wall).toBe(2)
  expect((await counts(page)).door).toBe(2)
  const copyId = (await selected(page))[0] as string
  const copyChildren = ((await nodeOf(page, copyId))?.children ?? []) as string[]
  expect(copyChildren).toHaveLength(1)
  expect(copyChildren[0]).not.toBe(doorId)
  const copyDoor = await nodeOf(page, copyChildren[0] as string)
  expect(copyDoor).toMatchObject({ wallId: copyId, parentId: copyId })
  expect(await nodeOf(page, doorId)).toMatchObject({ wallId })
})

test('Borrar un mueble suelto no pregunta; Borrar un muro con una puerta pide confirmar y Cancelar no borra nada', async ({ page }) => {
  await createBlankProject(page, 'borrar')
  const itemId = (await hook(page, 'addItem')) as string
  await hook(page, 'select', itemId)
  await panel(page).getByRole('button', { name: 'Borrar' }).click()
  await expect(panel(page)).toHaveCount(0)
  expect((await counts(page)).item ?? 0).toBe(0)

  await withWall(page)
  await hook(page, 'addDoor')
  await hook(page, 'selectFirstWall')
  await panel(page).getByRole('button', { name: 'Borrar' }).click()
  const warning = panel(page).getByRole('alert')
  await expect(warning).toContainText('Este muro tiene 1 elemento que también se borrará.')
  await warning.getByRole('button', { name: 'Cancelar' }).click()
  await expect(warning).toHaveCount(0)
  expect(await counts(page)).toMatchObject({ wall: 1, door: 1 })

  await panel(page).getByRole('button', { name: 'Borrar' }).click()
  await panel(page).getByRole('alert').getByRole('button', { name: 'Borrar' }).click()
  await expect.poll(async () => (await counts(page)).wall ?? 0).toBe(0)
  expect((await counts(page)).door ?? 0).toBe(0)
  await undoRedo(page).undo.click() // el muro y su puerta vuelven juntos: fue un solo paso del historial
  await expect.poll(async () => (await counts(page)).wall).toBe(1)
  expect((await counts(page)).door).toBe(1)
})

test('si el elemento elegido desaparece con el panel abierto, el panel se cierra sin errores', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await createBlankProject(page, 'desaparece')
  const id = (await hook(page, 'addItem')) as string
  await hook(page, 'select', id)
  await expect(panel(page)).toBeVisible({ timeout: 15_000 })
  await hook(page, 'deleteNode', id)
  await expect(panel(page)).toHaveCount(0)
  expect(errors).toEqual([])
})
