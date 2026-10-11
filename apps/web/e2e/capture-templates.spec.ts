// Captura la miniatura 3D de cada plantilla con el editor real y la guarda en public/templates/<id>.jpg.
// No corre con `pnpm e2e`: se pide con `pnpm --filter @interiores/web templates:thumbs` (necesita Supabase local y la API).
import { type Page, test } from '@playwright/test'
import { TEMPLATES } from '../src/lib/templates'

test.skip(process.env.CAPTURE_TEMPLATES !== '1', 'Solo con templates:thumbs')

const VIEWPORT = { width: 1700, height: 1000 }
// Zona del lienzo libre de paneles (el panel de muebles ocupa 345 px a la izquierda y hay barras arriba y abajo), proporción 3:2.
const CLIP = { x: 445, y: 135, width: 1155, height: 770 }
// Muros: 'cutaway' recorta los que tapan la vista; 'down' los baja.
const WALL_MODE = 'down'

async function open(page: Page, kind: string, name: string) {
  await page.goto('/proyectos')
  await page.getByLabel('Nombre del proyecto').fill(`Captura ${name} ${Date.now()}`)
  await page.getByLabel('Tipo').selectOption(kind)
  await page.getByRole('radio', { name: new RegExp(name) }).check({ force: true })
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.waitForURL(/\/proyectos\/[0-9a-f-]{36}$/, { timeout: 60_000 })
  await page.waitForFunction(() => (window as unknown as { __e2e?: { ready(): boolean } }).__e2e?.ready())
}

for (const template of TEMPLATES) {
  test(`capturar ${template.id}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(VIEWPORT)
    await open(page, template.kind, template.name.split(' ')[0] as string)
    await page.waitForTimeout(6000) // texturas y modelos
    // Con los muros cercanos recortados se ve el interior desde la cámara por defecto.
    await page.evaluate((mode) => (window as unknown as { __e2e: { setWallMode(m: string): void } }).__e2e.setWallMode(mode), WALL_MODE)
    await page.waitForTimeout(2500)
    await page.mouse.move(20, 990) // fuera del lienzo: nada queda resaltado
    await page.waitForTimeout(800)
    await page.screenshot({ path: `public/templates/${template.id}.jpg`, type: 'jpeg', quality: 86, clip: CLIP })
  })
}
