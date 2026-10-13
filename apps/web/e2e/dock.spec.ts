import { expect, test } from '@playwright/test'
import {
  type Arming,
  DOCK,
  MEASURE_ENTRIES,
  OPENING_ENTRIES,
  type StructureTool,
  activeDockId,
  expectedState,
  structureEntries,
} from '../src/editor/shell/dock-model'
import { ready } from './support/editor'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { dock, dockButton, modeButton } from './support/shell'

type Step = { label: string; via?: string; arming: Arming }
const STEPS: Step[] = [
  { label: 'Seleccionar', arming: { kind: 'select' } },
  ...structureEntries().map((e): Step => ({ via: 'Estructura', label: e.label, arming: { kind: 'tool', tool: e.id.startsWith('stair') ? 'stair' : (e.id as StructureTool) } })),
  ...OPENING_ENTRIES.map((e): Step => ({ via: 'Aberturas', label: e.label, arming: { kind: 'tool', tool: e.id } })),
  { label: 'Muebles', arming: { kind: 'furniture' } },
  { label: 'Materiales', arming: { kind: 'paint' } },
  ...MEASURE_ENTRIES.map((e): Step => ({ via: 'Medir', label: e.label, arming: { kind: 'measure', measure: e.id } })),
]
const labelOfActive = (state: { mode: string; tool: string | null }) =>
  DOCK.find((b) => b.id === activeDockId({ mode: state.mode as never, tool: state.tool }))?.label

test('cada botón y cada entrada de menú deja a Pascal en la fase, el modo y la herramienta de la tabla 4.3', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E dock ${Date.now()}`, template: null })
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  for (const step of STEPS) {
    if (step.via) {
      await dockButton(page, step.via).click()
      await page.getByRole('menuitem', { name: step.label, exact: true }).click()
    } else {
      await dockButton(page, step.label).click()
    }
    const want = expectedState(step.arming)
    const target = { mode: want.mode, tool: want.tool, ...(want.phase ? { phase: want.phase } : {}) }
    await expect
      .poll(
        async () => {
          const s = await hook(page, 'state')
          return { mode: s.mode, tool: s.tool, ...(want.phase ? { phase: s.phase } : {}) }
        },
        { message: `${step.via ?? 'dock'} › ${step.label}`, timeout: 10_000 },
      )
      .toEqual(target)
    const pressed = labelOfActive(want)
    if (pressed) await expect(dockButton(page, pressed)).toHaveAttribute('aria-pressed', 'true')
  }
})

test('el dock marca la herramienta REAL de Pascal al abrir y después de recargar (Pascal restaura fase y herramienta)', async ({ page }) => {
  const url = await createProjectViaUi(page, { name: `E2E dock real ${Date.now()}`, template: null })
  // Un proyecto en blanco abre con la herramienta de muro ya armada: el dock no puede suponer "Seleccionar".
  await expect(dockButton(page, 'Estructura')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  await hook(page, 'addWall')
  await dockButton(page, 'Aberturas').click()
  await page.getByRole('menuitem', { name: 'Ventana', exact: true }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Guardado', { timeout: 30_000 })
  await page.goto(url)
  await ready(page)
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  const label = labelOfActive(await hook(page, 'state'))
  const pressed = await dock(page).getByRole('button', { pressed: true }).allInnerTexts()
  expect(pressed.map((t) => t.trim())).toEqual(label ? [label] : [])
})

test('en Ver el dock no está en pantalla y Editar lo devuelve', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E dock ver ${Date.now()}`, template: null })
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  await modeButton(page, 'Ver').click()
  await expect(dock(page)).toHaveCount(0)
  await modeButton(page, 'Editar').click()
  await expect(dock(page)).toBeVisible()
})

test('Más: cuadrícula y ajuste cambian lo de Pascal, Eliminar arma el borrado, Atajos abre su diálogo y ya no hay botones Pronto (solo lo que funciona, con Exportar plano)', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E mas ${Date.now()}`, template: null })
  const more = page.getByRole('dialog', { name: 'Más opciones' })
  await dockButton(page, 'Más').click()
  await expect(more).toBeVisible({ timeout: 15_000 })
  await more.getByRole('button', { name: '25 cm' }).click()
  await expect.poll(async () => (await hook(page, 'state')).gridSnapStep).toBe(0.25)
  await more.getByRole('button', { name: 'Ángulos' }).click()
  await expect.poll(async () => (await hook(page, 'state')).snapWall).toBe('angles')
  for (const name of ['Compartir', 'Renderizar']) await expect(more.getByRole('button', { name })).toHaveCount(0)
  await expect(more.getByRole('button', { name: 'Exportar plano' })).toBeEnabled()
  await expect(more.getByRole('button', { name: 'Muebles desde una foto' })).toBeEnabled()
  await expect(more.getByText('Pronto')).toHaveCount(0)

  await more.getByRole('button', { name: 'Atajos de teclado' }).click()
  const shortcuts = page.getByRole('dialog', { name: 'Atajos de teclado' })
  await expect(shortcuts).toBeVisible()
  await expect(shortcuts).toContainText('Borrar lo elegido')
  await page.keyboard.press('Escape')
  await expect(shortcuts).toBeHidden()

  await dockButton(page, 'Más').click()
  await more.getByRole('button', { name: 'Eliminar elementos' }).click()
  await expect.poll(async () => (await hook(page, 'state')).mode).toBe('delete')
  await expect(dockButton(page, 'Más')).toHaveAttribute('aria-pressed', 'true')
})

test('un menú del dock enfoca su primera entrada, las flechas mueven el foco y Esc lo cierra y devuelve el foco al botón', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E menu ${Date.now()}`, template: null })
  await dockButton(page, 'Estructura').click()
  await expect(page.getByRole('menuitem', { name: 'Muro', exact: true })).toBeFocused({ timeout: 15_000 })
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Ambiente', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'Estructura' })).toHaveCount(0)
  await expect(dockButton(page, 'Estructura')).toBeFocused()
  // Escape cerró el menú sin cancelar la herramienta que ya estaba armada.
  expect((await hook(page, 'state')).tool).toBe('wall')
})

test('Esc en el diálogo de atajos lo cierra sin desarmar la herramienta de Pascal y devuelve el foco al botón Más', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E atajos esc ${Date.now()}`, template: null })
  await dockButton(page, 'Estructura').click()
  await page.getByRole('menuitem', { name: 'Muro', exact: true }).click()
  await expect.poll(async () => (await hook(page, 'state')).tool, { timeout: 15_000 }).toBe('wall')
  await dockButton(page, 'Más').click()
  await page.getByRole('button', { name: 'Atajos de teclado' }).click()
  const shortcuts = page.getByRole('dialog', { name: 'Atajos de teclado' })
  await expect(shortcuts).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(shortcuts).toBeHidden()
  expect((await hook(page, 'state')).tool).toBe('wall')
  await expect(dockButton(page, 'Más')).toBeFocused()
})

test('Atajos: el botón Cerrar cierra el diálogo y devuelve el foco a Más', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E atajos cerrar ${Date.now()}`, template: null })
  await dockButton(page, 'Más').click()
  await page.getByRole('button', { name: 'Atajos de teclado' }).click()
  const shortcuts = page.getByRole('dialog', { name: 'Atajos de teclado' })
  await expect(shortcuts).toBeVisible()
  await shortcuts.getByRole('button', { name: 'Cerrar' }).click()
  await expect(shortcuts).toBeHidden()
  await expect(dockButton(page, 'Más')).toBeFocused()
})
