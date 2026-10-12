import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'

const PIECES = ['dock', 'inspector', 'helpers', 'level-selector'] as const
/** Dos fotogramas: deja que React pinte lo que el estado acaba de pedir. */
const settle = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))

/** Cuántos elementos de cada pieza de Pascal hay en pantalla: por el atributo del parche y por los ganchos NATIVOS de Pascal. */
const found = (page: Page) =>
  page.evaluate((pieces) => {
    const count = (selector: string) => document.querySelectorAll(selector).length
    return {
      porAtributo: Object.fromEntries(pieces.map((p) => [p, count(`[data-pascal-${p}]`)])),
      // Ganchos propios de Pascal (sin parche): el dock es `mode-select` y el selector de nivel `level-add`/`level-ground`.
      nativos: count('[data-guide-target="mode-select"], [data-guide-target="level-add"], [data-guide-target="level-ground"]'),
      // Clases del inspector flotante y de los ayudantes en Pascal 1.0.3.
      porClases: count('[data-viewer-bounds] .fixed.top-20.right-4, [data-viewer-bounds] .fixed.top-1\\/2.right-4'),
    }
  }, PIECES)

test('el dock, el inspector, los ayudantes y el selector de nivel de Pascal no existen en pantalla (y la guarda no es vacua)', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E parche ${Date.now()}`, template: null })
  await hook(page, 'addWall')
  await hook(page, 'selectFirstWall') // con un muro elegido, el inspector de Pascal sería visible
  await hook(page, 'armWall') // con la herramienta de muro armada, sus ayudantes serían visibles
  await settle(page)

  // Guarda: con el parche aplicado no hay nada de Pascal, ni por atributo ni por sus ganchos nativos ni por clases.
  const hidden = await found(page)
  expect(hidden.porAtributo).toEqual({ dock: 0, inspector: 0, helpers: 0, 'level-selector': 0 })
  expect(hidden.nativos).toBe(0)
  expect(hidden.porClases).toBe(0)

  // Control: al pedir el chrome de Pascal los selectores sí encuentran las cuatro piezas (así el cero de arriba significa algo).
  await hook(page, 'setChrome', { dock: true, inspector: true, helpers: true, levelSelector: true })
  await expect.poll(async () => (await found(page)).porAtributo, { timeout: 15_000 }).toEqual({
    dock: 1,
    inspector: 1,
    helpers: 1,
    'level-selector': 1,
  })
  const shown = await found(page)
  expect(shown.nativos).toBeGreaterThan(0)
  expect(shown.porClases).toBeGreaterThan(0)

  // Y vuelve a ocultarse.
  await hook(page, 'setChrome', { dock: false, inspector: false, helpers: false, levelSelector: false })
  await settle(page)
  expect((await found(page)).porAtributo).toEqual({ dock: 0, inspector: 0, helpers: 0, 'level-selector': 0 })
})
