import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dock, dockButton, modeButton } from './support/shell'

/** Palabras de interfaz en inglés (el chrome de Pascal y sus nombres por defecto) que no deben verse ni leerse en el shell. */
const KNOWN_ENGLISH = new RegExp(
  `\\b(${[
    'Ground Floor', 'Floor \\d', 'Basement', 'Zone \\d', 'Measurement \\d',
    'Select', 'Build', 'Delete', 'Undo', 'Redo', 'Save', 'Saved', 'Saving', 'Cancel', 'Search', 'Settings',
    'Share', 'Export', 'Upload', 'Furniture', 'Wall', 'Walls', 'Door', 'Window', 'Roof', 'Ceiling',
    'Level', 'Levels', 'Measure', 'Grid', 'Snap', 'Close', 'Back', 'Next', 'Loading', 'Walkthrough',
    'Orbit', 'Top view', 'Rotate', 'Move', 'Copy', 'Paste', 'Add', 'Remove', 'Edit', 'View',
  ].join('|')})\\b`,
  'gi',
)

/** Todo lo que el shell muestra o lee: su texto y los atributos que un lector de pantalla anuncia. */
const shellTexts = (page: Page) =>
  page.locator('[data-editor-shell]').evaluate((root) => {
    const texts = [root.textContent ?? '']
    for (const el of root.querySelectorAll('[aria-label], [title], [placeholder], img[alt]')) {
      for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
        const value = el.getAttribute(name)
        if (value) texts.push(value)
      }
    }
    return texts
  })

async function expectSpanish(page: Page, where: string) {
  const found = (await shellTexts(page)).join('\n').match(KNOWN_ENGLISH) ?? []
  expect(found, `Palabras en inglés a la vista en: ${where}`).toEqual([])
}

test('el shell entero está en castellano: dock, menús, paneles, fichas de cada tipo y Ver', async ({ page }) => {
  await createBlankProject(page, 'castellano')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  await dockButton(page, 'Seleccionar').click()
  await expectSpanish(page, 'Editar con el panel de niveles')

  // Un proyecto en blanco no trae muros: se agrega uno para tener muro, puerta y ventana.
  // El ambiente nace como "Zone 1" en el nodo (Pascal) y el shell lo muestra traducido.
  await hook(page, 'addWall')
  const wallId = (await hook(page, 'selectFirstWall')) as string
  const doorId = (await hook(page, 'addDoor')) as string
  const windowId = (await hook(page, 'addWindow')) as string
  const itemId = (await hook(page, 'addItem')) as string
  const zoneId = (await hook(page, 'addZone')) as string
  expect(await hook(page, 'node', zoneId)).toMatchObject({ name: 'Zone 1' })
  for (const [kind, id] of [['muro', wallId], ['puerta', doorId], ['ventana', windowId], ['mueble', itemId], ['ambiente', zoneId]] as const) {
    await hook(page, 'select', id)
    await expect(page.getByRole('complementary', { name: 'Propiedades' })).toBeVisible()
    await expectSpanish(page, `la ficha de ${kind}`)
  }

  for (const menu of ['Estructura', 'Aberturas', 'Medir']) {
    await dockButton(page, menu).click()
    await expect(page.getByRole('menu', { name: menu })).toBeVisible()
    await expectSpanish(page, `el menú ${menu}`)
    await page.keyboard.press('Escape')
  }

  for (const panel of ['Muebles', 'Materiales']) {
    await dockButton(page, panel).click()
    await expect(page.getByRole('complementary', { name: panel })).toBeVisible()
    await expectSpanish(page, `el panel ${panel}`)
  }

  await modeButton(page, 'Ver').click()
  await expect(page.getByRole('complementary', { name: 'Vista 3D' })).toBeVisible()
  await expectSpanish(page, 'Ver con el panel Vista 3D')
})
