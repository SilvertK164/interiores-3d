import { type Page, expect, test } from '@playwright/test'
import { MIN_CONFIDENCE } from '../src/lib/lab/layout-constants'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import { counts, ready, templateCounts } from './support/editor'
import { hook } from './support/hooks'
import { PROJECT_URL } from './support/projects'
import { ANALYZE_URL, analyzePhoto, answerWith, failWith, sentBy } from './support/analysis'

// Las piezas del ejemplo con confianza suficiente: la planta (20 %) se descarta con aviso.
const EXAMPLE_PIECES = SAMPLE_ANALYSIS.furniture.filter((piece) => piece.confidence >= MIN_CONFIDENCE).length

/** La escena de «Escena desde una foto» con el análisis de ejemplo: un ambiente de 5 × 4,4 m con piso, cielo, cuatro muros, puerta, ventana y los muebles dentro. */
async function expectExampleScene(page: Page) {
  await expect.poll(async () => (await counts(page)).zone, { timeout: 60_000 }).toBe(1)
  expect(await counts(page)).toMatchObject({ zone: 1, slab: 1, ceiling: 1, wall: 4, door: 1, window: 1, item: EXAMPLE_PIECES })
  // La escena queda centrada en el origen: el ambiente va de -2,5 a 2,5 en x y de -2,2 a 2,2 en z; ningún mueble pisa un muro (la cara está a 0,1 m del
  // borde) y solo la tele, sobre su mueble, no está en el piso (0,35 m).
  const items = (await hook(page, 'nodesOf', 'item')) as { asset: { id: string }; position: [number, number, number] }[]
  expect(items).toHaveLength(EXAMPLE_PIECES)
  for (const { asset, position } of items) {
    expect(Math.abs(position[0]), asset.id).toBeLessThanOrEqual(2.5 - 0.1 + 0.01)
    expect(Math.abs(position[2]), asset.id).toBeLessThanOrEqual(2.2 - 0.1 + 0.01)
    expect(position[1], asset.id).toBe(asset.id === 'television' ? 0.35 : 0)
  }
}

test.describe('escena desde una foto', () => {
  test('con el análisis simulado, analizar una foto muestra avisos, la tabla de piezas y el JSON crudo, y envía bien el pedido', async ({ page }) => {
    let sent: ReturnType<typeof sentBy> | undefined
    await page.route(ANALYZE_URL, (route) => {
      sent = sentBy(route.request())
      return answerWith(SAMPLE_ANALYSIS)(route)
    })
    await analyzePhoto(page, '4,5')

    await expect(page.getByRole('heading', { name: 'Muebles encontrados' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: SAMPLE_ANALYSIS.warnings[0] as string })).toBeVisible()

    // El ambiente en metros, desde dónde se tomó la foto y las aberturas.
    await expect(page.getByTestId('room-summary')).toHaveText('Ambiente de 5 × 4,4 m (ancho × fondo)')
    await expect(page.getByText('Foto tomada a 2,5 m del muro oeste y 4,3 m del muro norte, mirando hacia el norte.')).toBeVisible()
    await expect(page.getByText('Aberturas: ventana en el muro este, puerta en el muro sur.')).toBeVisible()

    const table = page.getByRole('table', { name: 'Piezas detectadas' })
    await expect(table.getByRole('row')).toHaveCount(SAMPLE_ANALYSIS.furniture.length + 1) // + la fila de títulos
    // El nombre sale del catálogo que se le envió al análisis (las tablas en castellano), no del id que devuelve.
    for (const label of ['Mueble de TV', 'Televisor', 'Alfombra rectangular', 'Mesa de centro', 'Sofá', 'Sillón', 'Biblioteca', 'Lámpara de pie', 'Planta de interior']) {
      await expect(table.getByRole('rowheader', { name: label })).toBeVisible() // la de confianza baja lleva además «Confianza baja»
    }
    await expect(table.getByRole('cell', { name: '20 %', exact: true })).toBeVisible() // la confianza baja del ejemplo
    // La posición en metros y hacia dónde mira cada pieza, en castellano.
    const rowOf = (label: string) => table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: label, exact: true }) })
    await expect(rowOf('Sofá')).toContainText('2,5 m del muro oeste')
    await expect(rowOf('Sofá')).toContainText('mira al norte')
    await expect(rowOf('Sofá')).toContainText('contra el muro sur')
    await expect(rowOf('Televisor')).toContainText('sobre «Mueble de TV»')
    await expect(rowOf('Sillón')).toContainText('mira al oeste')

    expect(JSON.parse((await page.getByTestId('raw-json').textContent()) ?? '')).toEqual(SAMPLE_ANALYSIS)

    // El pedido llevó la sesión, la foto reducida (JPEG en base64), el ancho con punto decimal y el catálogo sin rutas.
    expect(sent?.authorization).toMatch(/^Bearer /)
    expect(sent?.body.mime).toBe('image/jpeg')
    expect(sent?.body.image.startsWith('/9j/')).toBe(true)
    expect(sent?.body.knownWidthM).toBe(4.5)
    expect(sent?.body.catalog.map((option) => option.id)).toContain('sofa')
    // Cada pieza del catálogo viaja con sus medidas reales en metros [ancho, alto, fondo]: el análisis las usa de regla para estimar el ambiente.
    expect(sent?.body.catalog.find((option) => option.id === 'sofa')?.dimensions_m).toEqual([2.06, 0.74, 1.01])
    expect(JSON.stringify(sent?.body)).not.toMatch(/model.glb|items/)
  })

  test('si el análisis devuelve un id que el editor no tiene, la tabla lo muestra tal cual y lo aclara', async ({ page }) => {
    const unknown = { ...SAMPLE_ANALYSIS, furniture: [{ ...SAMPLE_ANALYSIS.furniture[0], asset_id: 'lampara-rara' }] }
    await page.route(ANALYZE_URL, answerWith(unknown))
    await analyzePhoto(page)
    const table = page.getByRole('table', { name: 'Piezas detectadas' })
    await expect(table.getByRole('rowheader', { name: 'lampara-rara (no está en el catálogo)' })).toBeVisible()
  })

  test('si el análisis no está disponible (503, sin clave de Gemini), la página lo explica en castellano sin nombrar la clave', async ({ page }) => {
    await page.route(ANALYZE_URL, failWith(503, 'analisis_no_disponible', 'falta GEMINI_API_KEY'))
    await analyzePhoto(page)

    // `getByRole('alert')` a secas también encuentra el anunciador de rutas de Next: se filtra por el texto.
    const message = page.getByRole('alert').filter({ hasText: 'no está disponible' })
    await expect(message).toContainText('El análisis de fotos no está disponible por ahora')
    await expect(message).not.toContainText('GEMINI')
    await expect(page.getByRole('heading', { name: 'Muebles encontrados' })).toHaveCount(0)
  })

  test('si ya se pidieron 10 análisis en la hora, la página lo dice (429)', async ({ page }) => {
    await page.route(ANALYZE_URL, failWith(429, 'limite_de_analisis'))
    await analyzePhoto(page)
    await expect(page.getByRole('alert').filter({ hasText: 'Llegaste' })).toHaveText('Llegaste al límite de 10 análisis por hora. Inténtalo más tarde.')
  })

  test('si no hay conexión con la API, la página lo dice', async ({ page }) => {
    await page.route(ANALYZE_URL, (route) => route.abort('connectionrefused'))
    await analyzePhoto(page)
    await expect(page.getByRole('alert').filter({ hasText: 'No hay conexión' })).toBeVisible()
  })

  test('«Abrir en el editor» crea el proyecto «Desde una foto · fecha y hora» y abre el editor con el ambiente y los muebles', async ({ page }) => {
    test.setTimeout(180_000)
    await page.route(ANALYZE_URL, answerWith(SAMPLE_ANALYSIS))
    await analyzePhoto(page)
    const created = page.waitForRequest((request) => request.method() === 'POST' && /\/v1\/projects$/.test(request.url()))
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()
    expect((await created).postDataJSON().name).toMatch(/^Desde una foto · \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    await expectExampleScene(page)
  })

  test('«Probar con un ejemplo» no llama a la API y abre un proyecto real en el editor, con el ambiente y los muebles del ejemplo', async ({ page }) => {
    test.setTimeout(180_000)
    let calledApi = false
    await page.route(ANALYZE_URL, (route) => {
      calledApi = true
      return route.abort()
    })
    await page.goto('/escena-desde-foto')
    await page.getByRole('button', { name: 'Probar con un ejemplo' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    await expectExampleScene(page)
    expect(calledApi).toBe(false)
  })

  test('la pantalla es del producto: no habla de laboratorio ni de modelado en blanco', async ({ page }) => {
    await page.goto('/escena-desde-foto')
    await expect(page.getByRole('heading', { name: 'Escena desde una foto', level: 1 })).toBeVisible()
    await expect(page.getByText(/laboratorio|victoria|en blanco/i)).toHaveCount(0)
  })

  test('/laboratorio, la dirección de antes, redirige para siempre a /escena-desde-foto', async ({ request }) => {
    const response = await request.get('/laboratorio', { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(new URL(response.headers().location ?? '', 'http://localhost').pathname).toBe('/escena-desde-foto')
  })

  test('el camino al editor funciona con cualquier definición válida: el Loft se abre con los mismos nodos que su plantilla', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto('/escena-desde-foto')
    await page.getByText('Comprobar que el camino al editor funciona').click()
    await page.getByRole('button', { name: 'Abrir el Loft como prueba' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)

    const want = templateCounts('loft')
    await expect.poll(async () => (await counts(page)).zone, { timeout: 60_000 }).toBe(want.zone)
    const got = await counts(page)
    for (const type of Object.keys(want)) expect(got[type], type).toBe(want[type])
  })

  test('con un doble clic se crea un solo proyecto y, si falla el guardado de la escena, se ofrece reintentar', async ({ page }) => {
    test.setTimeout(180_000)
    let projectsCreated = 0
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/v1\/projects$/.test(r.url())) projectsCreated++
    })
    let failedOnce = false
    await page.route('**/v1/projects/*/scene', (route) => {
      if (route.request().method() !== 'PUT' || failedOnce) return route.continue()
      failedOnce = true
      return route.abort('failed')
    })
    await page.goto('/escena-desde-foto')
    await page.getByText('Comprobar que el camino al editor funciona').click()
    await page.getByRole('button', { name: 'Abrir el Loft como prueba' }).dblclick()

    await expect(page.getByText('El proyecto se creó, pero no pudimos guardar la escena')).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: 'Reintentar guardar la escena' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    expect(projectsCreated).toBe(1)
  })
})
