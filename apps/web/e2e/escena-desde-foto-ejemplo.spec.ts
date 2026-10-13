import { type Page, expect, test } from '@playwright/test'
import { EXAMPLE_ANALYSIS, EXAMPLE_PHOTO } from '../src/lib/lab/sample-analysis'

// El ejemplo de /escena-desde-foto sigue los mismos pasos que una foto subida: (1) «Probar con un ejemplo» SOLO carga su foto en «Tu foto» (entera, con una
// etiqueta y el ancho vacío); (2) «Analizar foto» muestra, tras una espera corta y sin llamar a la API, los elementos encontrados y la vista previa de la
// escena desde arriba; (3) recién «Crear escena y abrir en el editor» crea el proyecto. La creación se deja en espera para que la página no navegue y se
// puedan mirar (y fotografiar) los dos pasos, a 1280 y a 390 px.
const SHOTS = 'test-results/escena-desde-foto'
const SCREENS = [
  { name: '1280', viewport: { width: 1280, height: 800 } },
  { name: '390', viewport: { width: 390, height: 844 } },
]

/** Cuánto se sale la página de la pantalla a lo ancho: tiene que ser 0 (nada de desplazamiento horizontal). */
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

for (const screen of SCREENS) {
  test(`el ejemplo en la pantalla de ${screen.name} px: primero solo su foto, después los elementos y la vista previa, y nada se crea hasta el último paso`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(screen.viewport)
    let calledApi = false
    await page.route('**/v1/analyze-room', (route) => {
      calledApi = true
      return route.abort()
    })
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let created = 0
    await page.route('**/v1/projects', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      created++
      await held
      return route.abort('failed')
    })
    await page.goto('/escena-desde-foto')
    await expect(page.getByRole('img', { name: /Foto de ejemplo/ })).toHaveCount(0) // antes de pulsar, la zona para subir la foto

    // Paso 1: «Probar con un ejemplo» solo carga la foto, entera y con su etiqueta; el ancho queda vacío y no aparece ningún resultado.
    await page.getByRole('button', { name: 'Probar con un ejemplo' }).click()
    const photo = page.getByRole('img', { name: EXAMPLE_PHOTO.alt })
    await expect(photo).toBeVisible()
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth), { timeout: 15_000 }).toBe(1600)
    await expect(page.getByText(EXAMPLE_PHOTO.label, { exact: true })).toBeVisible()
    await expect(page.getByLabel(/Ancho conocido/)).toHaveValue('')
    const box = await photo.boundingBox()
    expect(box).not.toBeNull()
    const { width = 0, height = 0 } = box ?? {}
    expect(width / height, 'proporción de la foto, sin recortar').toBeCloseTo(1600 / 1070, 1)
    const card = await page.getByRole('heading', { name: 'Tu foto' }).locator('xpath=ancestor::form').boundingBox()
    expect(width).toBeLessThanOrEqual((card?.width ?? 0) + 0.5)
    await expect(page.getByTestId('room-summary')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Muebles encontrados' })).toHaveCount(0)
    await expect(page.getByTestId('scene-plan')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Crear escena y abrir en el editor' })).toHaveCount(0)
    await expect(page).toHaveURL(/\/escena-desde-foto$/)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    await page.screenshot({ path: `${SHOTS}/ejemplo-cargado-${screen.name}.png`, fullPage: true })

    // Paso 2: «Analizar foto» espera un instante (con el Loader) y muestra los elementos y la vista previa; todavía no crea nada.
    await page.getByRole('button', { name: 'Analizar foto' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Analizando tu foto' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Revisa la escena antes de crearla' })).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId('room-summary')).toHaveText('Ambiente de 3,6 × 7,5 m (ancho × fondo)')
    await expect(page.getByRole('listitem').filter({ hasText: EXAMPLE_ANALYSIS.warnings[0] as string })).toBeVisible()
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(EXAMPLE_ANALYSIS.furniture.length + 1) // + la fila de títulos

    // La vista previa: una imagen con su texto alternativo, completa dentro de la pantalla y con las etiquetas cortas de las piezas.
    const plan = page.getByRole('img', { name: /^Vista desde arriba de un ambiente de 3,6 × 7,5 m con 14 muebles, 1 puerta y 1 ventana/ })
    await expect(plan).toBeVisible()
    await plan.scrollIntoViewIfNeeded()
    const planBox = await plan.boundingBox()
    expect(planBox?.x ?? -1).toBeGreaterThanOrEqual(0)
    expect((planBox?.x ?? 0) + (planBox?.width ?? 0)).toBeLessThanOrEqual(screen.viewport.width)
    const labels = await plan.locator('text').allTextContents()
    for (const text of ['Mueble TV', 'Tele', 'Alfombra', 'Mesa centro', 'Sofá', 'Sillón', 'Comedor', 'Cámara']) expect(labels, text).toContain(text)
    await expect(page.getByRole('button', { name: 'Crear escena y abrir en el editor' })).toBeVisible()
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    await page.screenshot({ path: `${SHOTS}/ejemplo-resultados-${screen.name}.png`, fullPage: true })
    await plan.screenshot({ path: `${SHOTS}/ejemplo-vista-previa-${screen.name}.png` })
    expect(created, 'hasta aquí no se creó ningún proyecto').toBe(0)
    expect(calledApi, 'el ejemplo no llama a la API de análisis').toBe(false)

    // Paso 3: recién aquí se crea el proyecto.
    await page.getByRole('button', { name: 'Crear escena y abrir en el editor' }).click()
    await expect.poll(() => created, { timeout: 30_000 }).toBe(1)

    // Se puede volver a subir la propia: «Usar mi propia foto» quita el ejemplo y sus resultados (cuando termina la espera).
    release()
    const own = page.getByRole('button', { name: 'Usar mi propia foto' })
    await expect(own).toBeEnabled({ timeout: 30_000 })
    await own.click()
    await expect(photo).toHaveCount(0)
    await expect(page.getByText('Foto del ambiente', { exact: true })).toBeVisible()
    await expect(page.getByTestId('room-summary')).toHaveCount(0)
    await expect(page.getByTestId('scene-plan')).toHaveCount(0)
  })
}
