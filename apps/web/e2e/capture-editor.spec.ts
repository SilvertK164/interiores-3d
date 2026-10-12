// Captura el editor real con la interfaz de Madori y guarda las pantallas en docs/design/implementado/ para compararlas a ojo con docs/design/12 a 17.
// No corre con `pnpm e2e`: se pide con `pnpm --filter @interiores/web editor:shots` (necesita Supabase local y la API, como las demás capturas).
import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'
import { templateById } from '../src/lib/templates'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { dock, dockButton, modeButton, viewButton } from './support/shell'

test.skip(process.env.CAPTURE_EDITOR !== '1', 'Solo con editor:shots')

const OUT = join(process.cwd(), '..', '..', 'docs', 'design', 'implementado')
const VIEWPORT = { width: 1440, height: 900 }

/** Aparta el cursor (nada queda resaltado) y espera a que terminen las animaciones y las texturas. */
async function shot(page: Page, name: string) {
  await page.mouse.move(1430, 450)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 88 })
}

test('capturar el editor en Editar y en Ver', async ({ page }) => {
  test.setTimeout(240_000)
  const loft = templateById('loft')
  if (!loft) throw new Error('Falta la plantilla "loft"')
  await page.setViewportSize(VIEWPORT)
  await createProjectViaUi(page, { name: `Captura editor ${Date.now()}`, kind: loft.kind, template: loft.name })
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(6000) // texturas y modelos
  await dockButton(page, 'Seleccionar').click()
  await hook(page, 'setWallMode', 'cutaway') // con los muros cercanos recortados se ve el interior

  await viewButton(page, '2D').click()
  await hook(page, 'selectFirstWall')
  await shot(page, 'editor-editar-planta') // docs/design/12

  await viewButton(page, '3D').click()
  await dockButton(page, 'Muebles').click()
  await shot(page, 'editor-muebles') // docs/design/15

  await dockButton(page, 'Materiales').click()
  await shot(page, 'editor-materiales') // docs/design/17

  await dockButton(page, 'Estructura').click()
  await shot(page, 'editor-menu-estructura') // docs/design/16
  await page.keyboard.press('Escape')

  await modeButton(page, 'Ver').click()
  await shot(page, 'editor-ver-3d') // docs/design/13

  await viewButton(page, 'Ambas').click()
  await shot(page, 'editor-ver-dividida') // docs/design/14
})
