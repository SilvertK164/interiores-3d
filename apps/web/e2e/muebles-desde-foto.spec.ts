import { type Locator, type Page, expect, test } from '@playwright/test'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import { counts } from './support/editor'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dockButton, undoRedo } from './support/shell'
import { ANALYZE_URL, answerWith, failWith, jpegSize, sentBy, solidPng, tinyPng } from './support/analysis'

// El análisis se simula con page.route sobre POST /v1/analyze-room (ver support/analysis.ts): no hace falta clave de Gemini ni cuota.
const photoDialog = (page: Page) => page.getByRole('dialog', { name: 'Muebles desde una foto' })
const items = async (page: Page) => (await counts(page)).item ?? 0

/** Abre «Muebles desde una foto» desde Más, como lo hace una persona. */
async function openFromMore(page: Page): Promise<Locator> {
  await dockButton(page, 'Más').click()
  await page.getByRole('dialog', { name: 'Más opciones' }).getByRole('button', { name: 'Muebles desde una foto' }).click()
  const dialog = photoDialog(page)
  await expect(dialog).toBeVisible()
  return dialog
}

async function analyze(dialog: Locator) {
  await dialog.getByLabel('Foto del ambiente').setInputFiles({ name: 'sala.png', mimeType: 'image/png', buffer: tinyPng() })
  await dialog.getByRole('button', { name: 'Analizar foto' }).click()
}

test.describe('muebles desde una foto', () => {
  test('agrega a la planta activa las piezas que propone el análisis (las que quedan marcadas), las deja seleccionadas juntas y un solo Deshacer las quita todas', async ({ page }) => {
    test.setTimeout(180_000)
    let sent: ReturnType<typeof sentBy> | undefined
    await page.route(ANALYZE_URL, (route) => {
      sent = sentBy(route.request())
      return answerWith(SAMPLE_ANALYSIS)(route)
    })
    await createBlankProject(page, 'foto')
    const before = await items(page)

    const dialog = await openFromMore(page)
    await analyze(dialog)

    // La lista: seis piezas (la planta de confianza baja se descarta con aviso), todas marcadas, con su nombre en castellano.
    await expect(dialog.getByRole('heading', { name: 'Muebles encontrados' })).toBeVisible()
    const boxes = dialog.getByRole('checkbox')
    await expect(boxes).toHaveCount(6)
    for (const name of ['Televisor', 'Mesa de centro', 'Sofá', 'Silla de comedor', 'Biblioteca', 'Cama doble']) {
      await expect(dialog.getByRole('checkbox', { name: new RegExp(name) })).toBeChecked()
    }
    await expect(dialog.getByText(SAMPLE_ANALYSIS.warnings[0] as string)).toBeVisible()
    await expect(dialog.getByText(/Se omitió «Planta de interior»/)).toBeVisible()
    await expect(dialog.getByText('6 de 6 muebles elegidos')).toBeVisible()

    // La persona quita una y agrega las demás.
    await dialog.getByRole('checkbox', { name: /Silla de comedor/ }).uncheck()
    await expect(dialog.getByText('5 de 6 muebles elegidos')).toBeVisible()
    await dialog.getByRole('button', { name: 'Agregar al proyecto' }).click()
    await expect(dialog).toBeHidden()

    // Se agregaron cinco muebles, todos en la planta activa, sobre el piso y con el tamaño real del catálogo.
    await expect.poll(async () => (await items(page)) - before).toBe(5)
    const state = await hook(page, 'state')
    const added = ((await hook(page, 'nodesOf', 'item')) as { id: string; parentId: string; position: number[]; asset: { id: string; dimensions: number[] } }[]).slice(before)
    expect(added.map((n) => n.asset.id).sort()).toEqual(['bookshelf', 'coffee-table', 'double-bed', 'sofa', 'television'])
    for (const node of added) {
      expect(node.parentId).toBe(state.levelId)
      expect(node.position[1]).toBe(0)
      expect(node.position.every(Number.isFinite)).toBe(true)
    }
    const sofa = added.find((n) => n.asset.id === 'sofa')
    expect(sofa?.asset.dimensions).toEqual([2.06, 0.74, 1.01])

    // Quedan seleccionadas todas juntas (la multiselección de Pascal las mueve, gira o borra a la vez) y el editor pasa a Seleccionar.
    expect([...state.selectedIds].sort()).toEqual(added.map((n) => n.id).sort())
    expect(state).toMatchObject({ mode: 'select', zoneId: null })

    // El pedido llevó la sesión, la foto reducida (un JPEG en base64) y el catálogo, sin rutas.
    expect(sent?.authorization).toMatch(/^Bearer /)
    expect(sent?.body.mime).toBe('image/jpeg')
    expect(sent?.body.image.startsWith('/9j/')).toBe(true)
    expect(sent?.body).not.toHaveProperty('knownWidthM')
    expect(sent?.body.catalog.map((option) => option.id)).toContain('sofa')
    expect(JSON.stringify(sent?.body)).not.toMatch(/model\.glb|\/items\//)

    // UN solo Deshacer las quita todas; Rehacer las devuelve.
    await undoRedo(page).undo.click()
    await expect.poll(() => items(page)).toBe(before)
    await undoRedo(page).redo.click()
    await expect.poll(() => items(page)).toBe(before + 5)
  })

  test('si el análisis falla, el diálogo lo explica en castellano y se puede volver a intentar sin perder lo escrito', async ({ page }) => {
    test.setTimeout(120_000)
    await page.route(ANALYZE_URL, failWith(503, 'analisis_no_disponible', 'falta GEMINI_API_KEY'))
    await createBlankProject(page, 'foto-error')
    const dialog = await openFromMore(page)
    await dialog.getByLabel('Ancho del ambiente').fill('4,5')
    await analyze(dialog)

    await expect(dialog.getByRole('alert')).toContainText('El análisis de fotos no está disponible por ahora')
    await expect(dialog.getByRole('alert')).not.toContainText('GEMINI')
    await expect(dialog.getByRole('button', { name: 'Agregar al proyecto' })).toHaveCount(0)
    await expect(dialog.getByLabel('Ancho del ambiente')).toHaveValue('4,5')
    await expect(dialog.getByRole('button', { name: 'Analizar foto' })).toBeEnabled()
    expect(await items(page)).toBe(0)
  })

  test('si el análisis no reconoce ningún mueble del catálogo, lo dice y no deja agregar nada; un ancho inválido se avisa antes de llamar a la API', async ({ page }) => {
    test.setTimeout(120_000)
    let calls = 0
    await page.route(ANALYZE_URL, (route) => {
      calls++
      return answerWith({ furniture: [], warnings: ['No se ve ningún mueble.'], calibration: { status: 'uncalibrated', width_m: null } })(route)
    })
    await createBlankProject(page, 'foto-vacia')
    const dialog = await openFromMore(page)

    await dialog.getByLabel('Ancho del ambiente').fill('0')
    await analyze(dialog)
    await expect(dialog.getByRole('alert')).toContainText('mayor que 0')
    expect(calls).toBe(0)

    await dialog.getByLabel('Ancho del ambiente').fill('')
    await dialog.getByRole('button', { name: 'Analizar foto' }).click()
    await expect(dialog.getByText('No encontramos muebles del catálogo en esta foto')).toBeVisible()
    await expect(dialog.getByText('No se ve ningún mueble.')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Agregar al proyecto' })).toBeDisabled()
    await dialog.getByRole('button', { name: 'Cambiar la foto' }).click()
    await expect(dialog.getByLabel('Foto del ambiente')).toBeVisible()
    expect(await items(page)).toBe(0)
  })

  test('muestra el aviso de privacidad, ya no pide ninguna dirección y reduce la foto (lado mayor 1600 px, JPEG) antes de enviarla', async ({ page }) => {
    test.setTimeout(120_000)
    let sent: ReturnType<typeof sentBy> | undefined
    await page.route(ANALYZE_URL, (route) => {
      sent = sentBy(route.request())
      return answerWith(SAMPLE_ANALYSIS)(route)
    })
    await createBlankProject(page, 'foto-reducida')
    const dialog = await openFromMore(page)

    await expect(dialog.getByText(/Google puede usar las fotos para mejorar sus productos/)).toBeVisible()
    await expect(dialog.getByText('Puedes analizar hasta 10 fotos por hora.')).toBeVisible()
    await expect(dialog.getByLabel(/Dirección del servicio/)).toHaveCount(0)
    await expect(dialog.getByText(/TP3/)).toHaveCount(0)

    const photo = solidPng(3200, 2000)
    await dialog.getByLabel('Foto del ambiente').setInputFiles({ name: 'sala-grande.png', mimeType: 'image/png', buffer: photo })
    await dialog.getByLabel('Ancho del ambiente').fill('4,5')
    await dialog.getByRole('button', { name: 'Analizar foto' }).click()
    await expect(dialog.getByRole('heading', { name: 'Muebles encontrados' })).toBeVisible({ timeout: 30_000 })

    expect(sent?.body.mime).toBe('image/jpeg')
    expect(sent?.body.knownWidthM).toBe(4.5)
    expect(jpegSize(sent?.body.image as string)).toEqual({ width: 1600, height: 1000 })
    expect(Buffer.from(sent?.body.image as string, 'base64').length).toBeLessThan(3 * 1024 * 1024)
  })

  test('si ya se pidieron 10 análisis en la hora, el diálogo lo dice en castellano y se puede volver a intentar', async ({ page }) => {
    test.setTimeout(120_000)
    await page.route(ANALYZE_URL, failWith(429, 'limite_de_analisis'))
    await createBlankProject(page, 'foto-limite')
    const dialog = await openFromMore(page)
    await analyze(dialog)

    // El editor corre WebGL por software y la foto se reduce en el mismo hilo: se le da más aire que los 5 s de siempre.
    await expect(dialog.getByRole('alert')).toHaveText('Llegaste al límite de 10 análisis por hora. Inténtalo más tarde.', { timeout: 30_000 })
    await expect(dialog.getByRole('button', { name: 'Analizar foto' })).toBeEnabled()
    expect(await items(page)).toBe(0)
  })

  test('Esc cierra el diálogo, devuelve el foco a Más y no deja agregado nada', async ({ page }) => {
    test.setTimeout(120_000)
    await createBlankProject(page, 'foto-esc')
    const dialog = await openFromMore(page)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(dockButton(page, 'Más')).toBeFocused()
    expect(await items(page)).toBe(0)
  })
})
