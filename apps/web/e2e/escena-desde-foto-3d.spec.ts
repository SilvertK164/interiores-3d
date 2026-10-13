import { expect, test } from '@playwright/test'
import { footprint } from '../src/lib/templates/geometry'
import { ANALYZE_URL, FOUR_PIECES_ANALYSIS, analyzePhoto, answerWith } from './support/analysis'
import { counts, ready } from './support/editor'
import { hook } from './support/hooks'
import { PROJECT_URL } from './support/projects'
import { viewButton } from './support/shell'

// «Escena desde una foto» de punta a punta con una respuesta del análisis de cuatro piezas del catálogo: «Abrir en el editor» genera el
// proyecto con muros, piso y las piezas, y el editor lo muestra en 3D. Las capturas (a 1280 px) quedan en test-results/escena-desde-foto/
// para mirarlas; lo que se comprueba aquí son las reglas (cuántos nodos hay y que cada pieza queda dentro y apoyada), no los píxeles.
const SHOTS = 'test-results/escena-desde-foto'

type ItemNode = { asset: { id: string; dimensions: [number, number, number] }; position: [number, number, number]; rotation: [number, number, number] }

test('abrir en el editor genera el ambiente con muros, piso y las cuatro piezas dentro, y se ve en 3D', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.route(ANALYZE_URL, answerWith(FOUR_PIECES_ANALYSIS))
  await analyzePhoto(page)
  await page.getByRole('button', { name: 'Abrir en el editor' }).click()
  await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
  await ready(page)
  await expect.poll(async () => (await counts(page)).zone, { timeout: 60_000 }).toBe(1)
  expect(await counts(page)).toMatchObject({ zone: 1, slab: 1, ceiling: 1, wall: 4, door: 1, window: 1, item: 4 })

  // La escena queda centrada en el origen: el ambiente de 4 × 3 m va de -2 a 2 en x y de -1,5 a 1,5 en z. Ninguna pieza flota
  // (y = 0) ni tiene una esquina a menos de 0,2 m del eje de un muro.
  const items = (await hook(page, 'nodesOf', 'item')) as unknown as ItemNode[]
  expect(items.map((item) => item.asset.id).sort()).toEqual(['bookshelf', 'coffee-table', 'sofa', 'tv-stand'])
  for (const { asset, position, rotation } of items) {
    expect(position[1], `${asset.id} apoyada en el piso`).toBe(0)
    const [width, , depth] = asset.dimensions
    for (const [x, z] of footprint([position[0], position[2]], width, depth, rotation[1])) {
      expect(Math.abs(x), `${asset.id} esquina en x`).toBeLessThanOrEqual(2 - 0.2 + 0.01)
      expect(Math.abs(z), `${asset.id} esquina en z`).toBeLessThanOrEqual(1.5 - 0.2 + 0.01)
    }
  }

  await viewButton(page, '3D').click()
  await hook(page, 'setWallMode', 'cutaway')
  await page.waitForTimeout(6000) // texturas y modelos
  await page.mouse.move(1270, 400) // el cursor no resalta nada
  await page.screenshot({ path: `${SHOTS}/editor-3d-1280.png` })

  // Con los muros enteros y la cámara más arriba se ve el ambiente desde el sur...
  await hook(page, 'setWallMode', 'up')
  await hook(page, 'setCameraPose', { position: [0, 9, 5.5], target: [0, 0, 0] })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SHOTS}/editor-3d-muros-1280.png` })

  // ...y desde arriba, con los muros translúcidos, se ve de un vistazo que ninguna pieza los cruza.
  await hook(page, 'setWallMode', 'translucent')
  await hook(page, 'setCameraPose', { position: [0, 10, 0.6], target: [0, 0, 0] })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SHOTS}/editor-3d-arriba-1280.png` })
})
