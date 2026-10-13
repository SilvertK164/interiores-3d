import { type Page, expect, test } from '@playwright/test'
import { EXAMPLE_ANALYSIS, EXAMPLE_PHOTO } from '../src/lib/lab/sample-analysis'

// «Probar con un ejemplo» de /escena-desde-foto trae SU foto: la tarjeta «Tu foto» la muestra entera y con una etiqueta, y «Resultado» carga el plano del
// ejemplo. La creación del proyecto se deja en espera para que la página no navegue y se pueda mirar (y fotografiar) lo que la persona ve mientras tanto.
const SHOTS = 'test-results/escena-desde-foto'
const SCREENS = [
  { name: '1280', viewport: { width: 1280, height: 800 } },
  { name: '390', viewport: { width: 390, height: 844 } },
]

/** Cuánto se sale la página de la pantalla a lo ancho: tiene que ser 0 (nada de desplazamiento horizontal). */
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

for (const screen of SCREENS) {
  test(`«Probar con un ejemplo» muestra la foto de ejemplo entera y su plano en la pantalla de ${screen.name} px`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(screen.viewport)
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/v1/projects', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      await held
      return route.abort('failed')
    })
    await page.goto('/escena-desde-foto')
    await expect(page.getByRole('img', { name: /Foto de ejemplo/ })).toHaveCount(0) // antes de pulsar, la zona para subir la foto
    await page.getByRole('button', { name: 'Probar con un ejemplo' }).click()

    const photo = page.getByRole('img', { name: EXAMPLE_PHOTO.alt })
    await expect(photo).toBeVisible({ timeout: 60_000 })
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth), { timeout: 15_000 }).toBe(1600)
    await expect(page.getByText(EXAMPLE_PHOTO.label, { exact: true })).toBeVisible()

    // Se ve completa: sin recortar (misma proporción que el archivo) y dentro de su tarjeta.
    const box = await photo.boundingBox()
    expect(box).not.toBeNull()
    const { width = 0, height = 0 } = box ?? {}
    expect(width / height, 'proporción de la foto, sin recortar').toBeCloseTo(1600 / 1070, 1)
    const card = await page.getByRole('heading', { name: 'Tu foto' }).locator('xpath=ancestor::form').boundingBox()
    expect(width).toBeLessThanOrEqual((card?.width ?? 0) + 0.5)

    // El plano del ejemplo ya está en «Resultado»: ambiente, aviso y tabla de piezas.
    await expect(page.getByTestId('room-summary')).toHaveText('Ambiente de 3,6 × 7,5 m (ancho × fondo)')
    await expect(page.getByRole('listitem').filter({ hasText: EXAMPLE_ANALYSIS.warnings[0] as string })).toBeVisible()
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(EXAMPLE_ANALYSIS.furniture.length + 1) // + la fila de títulos
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    await page.screenshot({ path: `${SHOTS}/ejemplo-${screen.name}.png`, fullPage: true })

    // Se puede volver a subir la propia: «Usar mi propia foto» quita el ejemplo (cuando termina la espera).
    release()
    const own = page.getByRole('button', { name: 'Usar mi propia foto' })
    await expect(own).toBeEnabled({ timeout: 30_000 })
    await own.click()
    await expect(photo).toHaveCount(0)
    await expect(page.getByText('Foto del ambiente', { exact: true })).toBeVisible()
    await expect(page.getByTestId('room-summary')).toHaveCount(0)
  })
}
