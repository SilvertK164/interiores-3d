import { type Page, expect, test } from '@playwright/test'
import { DOCK, expectedState } from '../src/editor/shell/dock-model'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dock, dockButton, modeButton } from './support/shell'

const LABELS = DOCK.map((button) => button.label)
const FIRST = LABELS[0] as string
const LAST = LABELS[LABELS.length - 1] as string
const state = (page: Page) => hook(page, 'state')

/** Controles visibles del shell que miden menos de 44 px (cuenta el área táctil extra de `shell-hit`, que va en su `::after`). */
const smallTargets = (page: Page) =>
  page.evaluate(() => {
    const MIN = 44
    const small: string[] = []
    const selector = '[data-editor-shell] :is(button, input, select, textarea, a[href], [role="menuitem"])'
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const after = getComputedStyle(el, '::after')
      const hasHitArea = after.position === 'absolute' && after.content !== 'none' && after.content !== 'normal'
      const grow = hasHitArea ? Math.max(0, -Number.parseFloat(after.top)) + Math.max(0, -Number.parseFloat(after.bottom)) : 0
      const height = box.height + grow
      if (box.width < MIN - 0.5 || height < MIN - 0.5) {
        const name = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 24) ?? ''
        small.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(box.width)}x${Math.round(height)}`)
      }
    }
    return small
  })

test('el dock es una barra de herramientas: las flechas, Inicio y Fin mueven el foco y se ve dónde está', async ({ page }) => {
  await createBlankProject(page, 'dock-flechas')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  const buttons = dock(page).getByRole('button')
  await expect(buttons).toHaveCount(DOCK.length)
  for (const pressed of await buttons.evaluateAll((els) => els.map((el) => el.getAttribute('aria-pressed')))) {
    expect(['true', 'false']).toContain(pressed)
  }

  await dockButton(page, FIRST).focus()
  for (const label of LABELS.slice(1)) {
    await page.keyboard.press('ArrowRight')
    await expect(dockButton(page, label)).toBeFocused()
  }
  await page.keyboard.press('ArrowRight')
  await expect(dockButton(page, FIRST)).toBeFocused() // da la vuelta
  await page.keyboard.press('ArrowLeft')
  await expect(dockButton(page, LAST)).toBeFocused()
  await page.keyboard.press('Home')
  await expect(dockButton(page, FIRST)).toBeFocused()
  await page.keyboard.press('End')
  await expect(dockButton(page, LAST)).toBeFocused()

  // Tab sigue pasando por cada botón, y el anillo de foco de 3 px se ve en cada uno.
  await dockButton(page, FIRST).focus()
  for (const label of LABELS.slice(1)) {
    await page.keyboard.press('Tab')
    const button = dockButton(page, label)
    await expect(button).toBeFocused()
    const ring = await button.evaluate((el) => `${getComputedStyle(el).outlineStyle} ${getComputedStyle(el).outlineWidth}`)
    expect(ring, label).toBe('solid 3px')
  }
})

test('Espacio y Enter arman la herramienta de un botón del dock igual que el clic', async ({ page }) => {
  await createBlankProject(page, 'dock-teclado')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  await dockButton(page, 'Seleccionar').click()
  await expect.poll(async () => (await state(page)).tool).toBeNull()

  await dockButton(page, 'Muebles').focus()
  await page.keyboard.press('Space')
  await expect
    .poll(async () => {
      const s = await state(page)
      return { phase: s.phase, mode: s.mode, tool: s.tool }
    })
    .toEqual(expectedState({ kind: 'furniture' }))
  await expect(dockButton(page, 'Muebles')).toHaveAttribute('aria-pressed', 'true')
  await expect(dock(page).getByRole('button', { pressed: true })).toHaveCount(1)

  await dockButton(page, 'Seleccionar').focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(async () => {
      const s = await state(page)
      return { mode: s.mode, tool: s.tool }
    })
    .toEqual(expectedState({ kind: 'select' }))
  await expect(dockButton(page, 'Seleccionar')).toHaveAttribute('aria-pressed', 'true')
})

test('todos los controles del shell miden al menos 44 px: Editar, menú abierto, Muebles, Materiales y Ver', async ({ page }) => {
  await createBlankProject(page, 'tamanos')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  await dockButton(page, 'Seleccionar').click()
  await hook(page, 'addWall')
  await hook(page, 'selectFirstWall')
  await expect(page.getByRole('complementary', { name: 'Propiedades' })).toBeVisible()
  expect(await smallTargets(page), 'Editar con un muro elegido').toEqual([])

  await dockButton(page, 'Estructura').click()
  await expect(page.getByRole('menu', { name: 'Estructura' })).toBeVisible()
  expect(await smallTargets(page), 'menú Estructura').toEqual([])
  await page.keyboard.press('Escape')

  await dockButton(page, 'Muebles').click()
  await expect(page.getByRole('complementary', { name: 'Muebles' })).toBeVisible()
  expect(await smallTargets(page), 'Muebles').toEqual([])

  await dockButton(page, 'Materiales').click()
  await expect(page.getByRole('complementary', { name: 'Materiales' })).toBeVisible()
  expect(await smallTargets(page), 'Materiales').toEqual([])

  await modeButton(page, 'Ver').click()
  await expect(page.getByRole('complementary', { name: 'Vista 3D' })).toBeVisible()
  expect(await smallTargets(page), 'Ver').toEqual([])
})

test('con "reducir movimiento" activado el shell no anima nada; sin esa preferencia, sí', async ({ page }) => {
  await createBlankProject(page, 'movimiento')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  const durations = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-editor-shell] button')].map((el) => getComputedStyle(el).transitionDuration),
    )
  const normal = await durations()
  expect(normal.length).toBeGreaterThan(5)
  expect(normal.some((d) => d !== '0s')).toBe(true) // sin la preferencia hay transiciones: la regla es lo que las apaga
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect((await durations()).every((d) => d === '0s')).toBe(true)
})
