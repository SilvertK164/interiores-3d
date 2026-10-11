// Captura la miniatura 3D de cada plantilla con el editor real y la guarda en public/templates/<id>.jpg.
// No corre con `pnpm e2e`: se pide con `pnpm --filter @interiores/web templates:thumbs` (necesita Supabase local y la API).
import { test } from '@playwright/test'
import { TEMPLATES } from '../src/lib/templates'
import { createProjectViaUi } from './support/projects'

test.skip(process.env.CAPTURE_TEMPLATES !== '1', 'Solo con templates:thumbs')

const VIEWPORT = { width: 1700, height: 1000 }
// Zona del lienzo libre de paneles (el panel de muebles ocupa 345 px a la izquierda y hay barras arriba y abajo), proporción 3:2.
const CLIP = { x: 445, y: 135, width: 1155, height: 770 }
// Muros: 'cutaway' recorta los que tapan la vista; 'down' los baja.
const WALL_MODE = 'down'

for (const template of TEMPLATES) {
  test(`capturar ${template.id}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(VIEWPORT)
    await createProjectViaUi(page, { name: `Captura ${template.name} ${Date.now()}`, kind: template.kind, template: template.name })
    await page.waitForTimeout(6000) // texturas y modelos
    // Con los muros cercanos recortados se ve el interior desde la cámara por defecto.
    await page.evaluate((mode) => (window as unknown as { __e2e: { setWallMode(m: string): void } }).__e2e.setWallMode(mode), WALL_MODE)
    await page.waitForTimeout(2500)
    await page.mouse.move(20, 990) // fuera del lienzo: nada queda resaltado
    await page.waitForTimeout(800)
    await page.screenshot({ path: `public/templates/${template.id}.jpg`, type: 'jpeg', quality: 86, clip: CLIP })
  })
}
