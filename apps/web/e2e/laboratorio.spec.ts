import { crc32, deflateSync } from 'node:zlib'
import { type Page, type Route, expect, test } from '@playwright/test'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import { counts, ready, templateCounts } from './support/editor'
import { PROJECT_URL } from './support/projects'

// TP3 vive en otro puerto (y en otro repositorio): estas pruebas lo simulan con page.route, así que no necesitan
// el servicio, ni clave de Gemini, ni cuota. Un pedido con FormData es "simple": basta con la cabecera de CORS en la respuesta.
const CORS = { 'access-control-allow-origin': '*' }
const MODELING_BLANK = /analysisToDefinition todavía está en blanco/

/** PNG de 2 × 2 píxeles armado a mano: lo mínimo para tener una foto válida sin guardar archivos binarios en el repo. */
function tinyPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(2, 0) // ancho
  header.writeUInt32BE(2, 4) // alto
  header[8] = 8 // bits por canal
  header[9] = 2 // color verdadero (RGB)
  const row = Buffer.from([0, 200, 180, 150, 200, 180, 150]) // filtro 0 + dos píxeles
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat([row, row]))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const answerWith = (analysis: unknown) => (route: Route) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(analysis) })

async function analyzePhoto(page: Page, width = '') {
  await page.goto('/laboratorio')
  await page.getByLabel('Foto del ambiente').setInputFiles({ name: 'sala.png', mimeType: 'image/png', buffer: tinyPng() })
  if (width) await page.getByLabel('Ancho conocido').fill(width)
  await page.getByRole('button', { name: 'Analizar foto' }).click()
}

test.describe('laboratorio', () => {
  test('con TP3 simulado, analizar una foto muestra avisos, la tabla de piezas y el JSON crudo, y envía bien el pedido', async ({ page }) => {
    let sent = ''
    await page.route('**/api/analyze-room', (route) => {
      sent = route.request().postDataBuffer()?.toString('latin1') ?? ''
      return answerWith(SAMPLE_ANALYSIS)(route)
    })
    await analyzePhoto(page, '4,5')

    await expect(page.getByRole('heading', { name: 'Resultado del análisis' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: SAMPLE_ANALYSIS.warnings[0] as string })).toBeVisible()

    const table = page.getByRole('table', { name: 'Piezas detectadas' })
    await expect(table.getByRole('row')).toHaveCount(SAMPLE_ANALYSIS.furniture.length + 1) // + la fila de títulos
    for (const label of ['Sofá', 'Mesa', 'Silla', 'Estante', 'Cama', 'Planta', 'Televisor']) {
      await expect(table.getByRole('rowheader', { name: label })).toBeVisible()
    }
    await expect(table.getByRole('cell', { name: '20 %', exact: true })).toBeVisible() // la confianza baja del ejemplo

    expect(JSON.parse(await page.getByTestId('raw-json').innerText())).toEqual(SAMPLE_ANALYSIS)

    expect(sent).toContain('name="image"; filename="sala.png"')
    expect(sent).toMatch(/name="known_width_m"\r\n\r\n4\.5\r\n/) // la coma decimal viaja como punto
  })

  test('recuerda la dirección del servicio de TP3 entre visitas', async ({ page }) => {
    await page.route('**/api/analyze-room', answerWith(SAMPLE_ANALYSIS))
    await page.goto('/laboratorio')
    await page.getByLabel('Dirección del servicio de TP3').fill('http://127.0.0.1:8000/')
    await page.getByLabel('Foto del ambiente').setInputFiles({ name: 'sala.png', mimeType: 'image/png', buffer: tinyPng() })
    await page.getByRole('button', { name: 'Analizar foto' }).click()
    await expect(page.getByRole('heading', { name: 'Resultado del análisis' })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Dirección del servicio de TP3')).toHaveValue('http://127.0.0.1:8000')
  })

  test('si TP3 responde 503 (sin clave de Gemini), la página lo explica en castellano', async ({ page }) => {
    await page.route('**/api/analyze-room', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({ error: { code: 'provider_not_configured', message: 'El servicio de análisis no está configurado (falta GEMINI_API_KEY).' } }),
      }),
    )
    await analyzePhoto(page)

    const message = page.getByRole('alert').filter({ hasText: 'GEMINI_API_KEY' })
    await expect(message).toContainText('no tiene la clave de Gemini')
    await expect(message).toContainText('lab/README.md')
    await expect(message).toContainText('Probar con un ejemplo')
    await expect(page.getByRole('heading', { name: 'Resultado del análisis' })).toHaveCount(0)
  })

  test('si TP3 no está corriendo, la página lo dice y apunta a la guía', async ({ page }) => {
    await page.route('**/api/analyze-room', (route) => route.abort('connectionrefused'))
    await analyzePhoto(page)

    const message = page.getByRole('alert').filter({ hasText: 'lab/README.md' })
    await expect(message).toContainText('no está corriendo')
    await expect(message).toContainText('http://localhost:8000')
  })

  test('mientras el modelado está en blanco, «Abrir en el editor» lo explica con amabilidad y la página sigue disponible', async ({ page }) => {
    await page.route('**/api/analyze-room', answerWith(SAMPLE_ANALYSIS))
    await analyzePhoto(page)
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()

    await expect(page.getByText(MODELING_BLANK)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Laboratorio de Victoria' })).toBeVisible()
    await expect(page).toHaveURL(/\/laboratorio$/)
    await expect(page.getByRole('button', { name: 'Abrir en el editor' })).toBeEnabled()
  })

  test('«Probar con un ejemplo (sin servicio)» no llama a TP3, muestra el ejemplo y explica que el modelado está en blanco', async ({ page }) => {
    let calledTp3 = false
    await page.route('**/api/analyze-room', (route) => {
      calledTp3 = true
      return route.abort()
    })
    await page.goto('/laboratorio')
    await page.getByRole('button', { name: 'Probar con un ejemplo (sin servicio)' }).click()

    await expect(page.getByText(MODELING_BLANK)).toBeVisible()
    await expect(page.getByText('Análisis de ejemplo: no viene de TP3.')).toBeVisible()
    await expect(page.getByRole('table', { name: 'Piezas detectadas' }).getByRole('row')).toHaveCount(SAMPLE_ANALYSIS.furniture.length + 1)
    expect(calledTp3).toBe(false)
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
