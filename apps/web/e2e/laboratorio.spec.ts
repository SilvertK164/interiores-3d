import { type Page, expect, test } from '@playwright/test'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import { counts, ready, templateCounts } from './support/editor'
import { PROJECT_URL } from './support/projects'
import { ANALYZE_URL, answerWith, failWith, sentBy, tinyPng } from './support/analysis'

const MODELING_BLANK = /analysisToDefinition todavía está en blanco/

async function analyzePhoto(page: Page, width = '') {
  await page.goto('/laboratorio')
  await page.getByLabel('Foto del ambiente').setInputFiles({ name: 'sala.png', mimeType: 'image/png', buffer: tinyPng() })
  if (width) await page.getByLabel('Ancho conocido').fill(width)
  await page.getByRole('button', { name: 'Analizar foto' }).click()
}

test.describe('laboratorio', () => {
  test('con el análisis simulado, analizar una foto muestra avisos, la tabla de piezas y el JSON crudo, y envía bien el pedido', async ({ page }) => {
    let sent: ReturnType<typeof sentBy> | undefined
    await page.route(ANALYZE_URL, (route) => {
      sent = sentBy(route.request())
      return answerWith(SAMPLE_ANALYSIS)(route)
    })
    await analyzePhoto(page, '4,5')

    await expect(page.getByRole('heading', { name: 'Resultado del análisis' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: SAMPLE_ANALYSIS.warnings[0] as string })).toBeVisible()

    const table = page.getByRole('table', { name: 'Piezas detectadas' })
    await expect(table.getByRole('row')).toHaveCount(SAMPLE_ANALYSIS.furniture.length + 1) // + la fila de títulos
    // El nombre sale del catálogo que se le envió al análisis (las tablas en castellano), no del id que devuelve.
    for (const label of ['Sofá', 'Mesa de centro', 'Silla de comedor', 'Biblioteca', 'Cama doble', 'Planta de interior', 'Televisor']) {
      await expect(table.getByRole('rowheader', { name: label })).toBeVisible()
    }
    await expect(table.getByRole('cell', { name: '20 %', exact: true })).toBeVisible() // la confianza baja del ejemplo

    expect(JSON.parse(await page.getByTestId('raw-json').innerText())).toEqual(SAMPLE_ANALYSIS)

    // El pedido llevó la sesión, la foto reducida (JPEG en base64), el ancho con punto decimal y el catálogo sin rutas.
    expect(sent?.authorization).toMatch(/^Bearer /)
    expect(sent?.body.mime).toBe('image/jpeg')
    expect(sent?.body.image.startsWith('/9j/')).toBe(true)
    expect(sent?.body.knownWidthM).toBe(4.5)
    expect(sent?.body.catalog.map((option) => option.id)).toContain('sofa')
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
    await expect(page.getByRole('heading', { name: 'Resultado del análisis' })).toHaveCount(0)
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

  test('mientras el modelado está en blanco, «Abrir en el editor» lo explica con amabilidad y la página sigue disponible', async ({ page }) => {
    await page.route(ANALYZE_URL, answerWith(SAMPLE_ANALYSIS))
    await analyzePhoto(page)
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()

    await expect(page.getByText(MODELING_BLANK)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Laboratorio de Victoria' })).toBeVisible()
    await expect(page).toHaveURL(/\/laboratorio$/)
    await expect(page.getByRole('button', { name: 'Abrir en el editor' })).toBeEnabled()
  })

  test('«Probar con un ejemplo (sin servicio)» no llama a la API, muestra el ejemplo y explica que el modelado está en blanco', async ({ page }) => {
    let calledApi = false
    await page.route(ANALYZE_URL, (route) => {
      calledApi = true
      return route.abort()
    })
    await page.goto('/laboratorio')
    await page.getByRole('button', { name: 'Probar con un ejemplo (sin servicio)' }).click()

    await expect(page.getByText(MODELING_BLANK)).toBeVisible()
    await expect(page.getByText('Análisis de ejemplo: no viene de una foto.')).toBeVisible()
    await expect(page.getByRole('table', { name: 'Piezas detectadas' }).getByRole('row')).toHaveCount(SAMPLE_ANALYSIS.furniture.length + 1)
    expect(calledApi).toBe(false)
  })

  test('el camino al editor funciona con cualquier definición válida: el Loft se abre con los mismos nodos que su plantilla', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto('/laboratorio')
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
    await page.goto('/laboratorio')
    await page.getByText('Comprobar que el camino al editor funciona').click()
    await page.getByRole('button', { name: 'Abrir el Loft como prueba' }).dblclick()

    await expect(page.getByText('El proyecto se creó, pero no pudimos guardar la escena')).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: 'Reintentar guardar la escena' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    expect(projectsCreated).toBe(1)
  })

  // Cuando analysisToDefinition exista, esta prueba puede activarse cambiando `test.fixme` por `test` (y la de «en blanco» de arriba
  // ya no tendrá sentido). Comprueba lo básico: el proyecto se abre y el editor muestra un ambiente con piezas; los conteos
  // exactos dependen de cómo se modele, así que se afinan al decidirlo.
  test.fixme('con el modelado en marcha, «Probar con un ejemplo» abre el editor con un ambiente y sus piezas', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto('/laboratorio')
    await page.getByRole('button', { name: 'Probar con un ejemplo (sin servicio)' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)

    const got = await counts(page)
    expect(got.zone).toBeGreaterThanOrEqual(1)
    expect((got.item ?? 0) + (got.shelf ?? 0) + (got.cabinet ?? 0)).toBeGreaterThan(0)
  })
})
