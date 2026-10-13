import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { ready } from './support/editor'
import { PROJECT_URL } from './support/projects'

// Herramienta de desarrollo (se salta sin REAL_PHOTO y REAL_OUT): manda una foto real por el flujo del producto (página → API → Gemini), guarda
// lo que responde la API y, si respondió un plano, lo abre en el editor y captura el 3D desde la cámara de la foto. La clave de Gemini nunca
// pasa por aquí: la usa el servidor de la API con su configuración (GEMINI_API_KEY en su entorno).
const PHOTO = process.env.REAL_PHOTO ?? ''
const OUT = process.env.REAL_OUT ?? ''
const SHOT = process.env.REAL_SHOT ?? ''

test('foto real: el plano que devuelve Gemini y su escena en 3D', async ({ page }) => {
  test.skip(!PHOTO || !OUT, 'faltan REAL_PHOTO y REAL_OUT')
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/escena-desde-foto')
  await page.getByLabel('Foto del ambiente').setInputFiles(PHOTO)
  const responded = page.waitForResponse((r) => r.url().endsWith('/v1/analyze-room'), { timeout: 150_000 })
  await page.getByRole('button', { name: 'Analizar foto' }).click()
  const res = await responded
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // se guarda como texto
  }
  writeFileSync(OUT, JSON.stringify({ status: res.status(), response: body }, null, 2))
  console.log(`estado ${res.status()}`)
  if (res.status() !== 200) return

  await expect(page.getByRole('heading', { name: 'Muebles encontrados' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Abrir en el editor' }).click()
  await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
  await ready(page)
  await page.waitForTimeout(8000) // texturas, modelos y que la cámara llegue a la pose de la foto
  await page.mouse.move(1270, 400)
  if (SHOT) await page.screenshot({ path: SHOT })
})
