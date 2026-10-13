import { expect, test } from '@playwright/test'
import { footprint } from '../src/lib/templates/geometry'
import { ANALYZE_URL, HALL_ANALYSIS, analyzePhoto, answerWith } from './support/analysis'
import { counts, ready } from './support/editor'
import { hook } from './support/hooks'
import { PROJECT_URL } from './support/projects'
import { viewButton } from './support/shell'

// «Escena desde una foto» de punta a punta con el plano de un salón largo y angosto (3,2 × 7 m) que «devuelve Gemini» (POST /v1/analyze-room
// simulado, con los errores típicos de una foto: el sofá de espaldas a la tele, el mueble de TV despegado del muro): «Crear escena y abrir en el editor» genera el
// proyecto con el ambiente del tamaño del plano, sus muros, la puerta y la ventana en los muros que dijo Gemini y las piezas ya acomodadas, y el editor
// lo muestra en 3D. Las capturas (a 1280 px) quedan en test-results/escena-desde-foto/ para mirarlas; lo que se comprueba aquí son las reglas (cuántos
// nodos hay, dónde queda cada pieza, hacia dónde mira y a qué altura, y que ninguna cruza un muro), no los píxeles.
const SHOTS = 'test-results/escena-desde-foto'

type ItemNode = { asset: { id: string; dimensions: [number, number, number] }; position: [number, number, number]; rotation: [number, number, number] }
type OpeningNode = { wallId: string; position: [number, number, number]; width: number }

// La escena queda centrada en el origen: el ambiente de 3,2 × 7 m va de -1,6 a 1,6 en x y de -3,5 a 3,5 en z (el fondo, donde está la tele, en z = -3,5).
const HALF_W = 1.6
const HALF_D = 3.5
// Una pieza del piso queda a 0,15 m del borde del rectángulo (la cara del muro está a 0,1 m); lo apoyado, a lo sumo hasta la cara del muro.
const FLOOR_MARGIN = 0.15
const WALL_FACE = 0.1

/** Hacia dónde mira el frente de una pieza en el plano de la escena: con el giro de Pascal, (sin θ, cos θ) (+z es el sur). */
const front = ([, rotY]: [number, number, number] | number[]) => [Math.round(Math.sin(rotY as number)) + 0, Math.round(Math.cos(rotY as number)) + 0]

test('abrir en el editor genera el salón de 3,2 × 7 m con sus muros, aberturas y las siete piezas acomodadas, y se ve en 3D', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.route(ANALYZE_URL, answerWith(HALL_ANALYSIS))
  await analyzePhoto(page)

  // La tarjeta de resultados dice el ambiente en metros y desde dónde se tomó la foto, y la tabla, la posición y hacia dónde mira cada pieza.
  await expect(page.getByTestId('room-summary')).toHaveText('Ambiente de 3,2 × 7 m (ancho × fondo)')
  await expect(page.getByText('Foto tomada a 1,6 m del muro oeste y 6,8 m del muro norte, mirando hacia el norte.')).toBeVisible()
  await expect(page.getByText('Aberturas: ventana en el muro este, puerta en el muro oeste.')).toBeVisible()
  const table = page.getByRole('table', { name: 'Piezas detectadas' })
  const rowOf = (label: string) => table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: label, exact: true }) })
  await expect(rowOf('Sofá')).toContainText('1,6 m del muro oeste')
  await expect(rowOf('Sofá')).toContainText('4,9 m del muro norte')
  await expect(rowOf('Sofá')).toContainText('mira al sur') // así lo dio Gemini; el acomodador lo gira
  await expect(rowOf('Mueble de TV')).toContainText('contra el muro norte')
  await expect(rowOf('Televisor')).toContainText('sobre «Mueble de TV»')

  await page.getByRole('button', { name: 'Crear escena y abrir en el editor' }).click()
  await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
  await ready(page)
  await expect.poll(async () => (await counts(page)).zone, { timeout: 60_000 }).toBe(1)
  expect(await counts(page)).toMatchObject({ zone: 1, slab: 1, ceiling: 1, wall: 4, door: 1, window: 1, item: 7 })

  // Las aberturas están en los muros que dijo Gemini: la ventana en el este, a 2 m desde la esquina norte; la puerta en el oeste, a 1 m desde la esquina
  // sur, que en el muro de la definición (de norte a sur) es 7 - 1 = 6 m.
  const windows = (await hook(page, 'nodesOf', 'window')) as unknown as OpeningNode[]
  const doors = (await hook(page, 'nodesOf', 'door')) as unknown as OpeningNode[]
  expect(windows[0]?.wallId).toMatch(/p_e$/)
  expect(windows[0]?.position[0]).toBeCloseTo(2, 3)
  expect(windows[0]?.width).toBeCloseTo(1.4, 3)
  expect(doors[0]?.wallId).toMatch(/p_w$/)
  expect(doors[0]?.position[0]).toBeCloseTo(6, 3)

  // Las piezas: cada una en su lugar, mirando hacia donde debe, y a la altura de su soporte.
  const items = (await hook(page, 'nodesOf', 'item')) as unknown as ItemNode[]
  const by = (id: string) => items.find((item) => item.asset.id === id) as ItemNode
  expect(items.map((item) => item.asset.id).sort()).toEqual(['coffee-table', 'indoor-plant', 'livingroom-chair', 'rectangular-carpet', 'sofa', 'television', 'tv-stand'])

  // La tele está contra el muro del fondo (norte, z = -3,5), sobre su mueble (0,35 m) y mirando hacia la sala (el sur).
  const stand = by('tv-stand')
  const tv = by('television')
  expect(stand.position[2]).toBeCloseTo(-HALF_D + FLOOR_MARGIN + 0.16, 2) // su fondo es de 0,32 m: el borde de atrás queda a 0,15 m
  expect(stand.position[0]).toBeCloseTo(0, 2)
  expect(stand.position[1]).toBe(0)
  expect(front(stand.rotation)).toEqual([0, 1])
  expect(tv.position[1]).toBeCloseTo(0.35, 3)
  expect(tv.position[0]).toBeCloseTo(stand.position[0], 2)
  expect(tv.position[2]).toBeCloseTo(stand.position[2], 2)
  expect(front(tv.rotation)).toEqual([0, 1])

  // El sofá mira a la tele (al norte, -z) y está más cerca de quien mira la foto que la mesa y que la tele; la alfombra queda bajo la mesa.
  const sofa = by('sofa')
  expect(front(sofa.rotation)).toEqual([0, -1])
  expect(sofa.position[2]).toBeGreaterThan(by('coffee-table').position[2])
  expect(by('coffee-table').position[2]).toBeGreaterThan(tv.position[2])
  expect(by('rectangular-carpet').position[0]).toBeCloseTo(by('coffee-table').position[0], 2)
  expect(by('rectangular-carpet').position[2]).toBeCloseTo(by('coffee-table').position[2], 2)

  // El sillón está contra el muro este (el de la ventana) y mira hacia el oeste (-x).
  const chair = by('livingroom-chair')
  expect(front(chair.rotation)).toEqual([-1, 0])
  expect(chair.position[0]).toBeCloseTo(HALF_W - FLOOR_MARGIN - 1.07 / 2, 2)

  // Ninguna pieza flota (salvo la tele sobre su mueble) ni tiene una esquina fuera de los muros.
  for (const { asset, position, rotation } of items) {
    if (asset.id !== 'television') expect(position[1], `${asset.id} apoyada en el piso`).toBe(0)
    const margin = asset.id === 'television' ? WALL_FACE : FLOOR_MARGIN
    const [width, , depth] = asset.dimensions
    for (const [x, z] of footprint([position[0], position[2]], width, depth, rotation[1])) {
      expect(Math.abs(x), `${asset.id} esquina en x`).toBeLessThanOrEqual(HALF_W - margin + 0.01)
      expect(Math.abs(z), `${asset.id} esquina en z`).toBeLessThanOrEqual(HALF_D - margin + 0.01)
    }
  }

  await viewButton(page, '3D').click()
  await hook(page, 'setWallMode', 'cutaway')
  await page.waitForTimeout(6000) // texturas y modelos
  await page.mouse.move(1270, 400) // el cursor no resalta nada
  await page.screenshot({ path: `${SHOTS}/editor-3d-1280.png` })

  // Con los muros enteros y la cámara más arriba se ve el salón desde el sur...
  await hook(page, 'setWallMode', 'up')
  await hook(page, 'setCameraPose', { position: [0, 9, 8], target: [0, 0, -0.5] })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SHOTS}/editor-3d-muros-1280.png` })

  // ...y desde arriba, con los muros translúcidos, se ve de un vistazo que ninguna pieza los cruza.
  await hook(page, 'setWallMode', 'translucent')
  await hook(page, 'setCameraPose', { position: [0, 11, 0.5], target: [0, 0, 0] })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SHOTS}/editor-3d-arriba-1280.png` })
})
