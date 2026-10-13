import { describe, expect, it } from 'vitest'
import { buildLabEnvelope } from '../src/editor/lab-scene'
import { MATERIAL_IDS } from '../src/editor/templates/scene-builder'
import { RECOGNIZABLE_IDS } from '../src/lib/lab/analysis-catalog'
import { FLOOR_MATERIAL, MIN_ROOM_WIDTH_M, WALL_CLEARANCE_M, analysisToDefinition } from '../src/lib/lab/analysis-to-definition'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import type { DetectedFurniture, RoomAnalysis } from '../src/lib/lab/schema'
import { footprint } from '../src/lib/templates/geometry'
import type { ItemDef, LevelDef, OpeningDef, RoomDef, TemplateDefinition } from '../src/lib/templates/types'
import { validateDefinition } from '../src/lib/templates/validate'
import { availableAssets } from './support/asset-ids'

// analysisToDefinition: del análisis de una foto al ambiente que abre «Escena desde una foto». Se prueba con las piezas reales del catálogo
// local (sus medidas salen de Pascal), el validador de plantillas y `buildLabEnvelope` de verdad, sin navegador.

// Las piezas del catálogo local con sus medidas reales (las mismas que ve el editor).
const ASSETS = new Map(
  availableAssets().map(({ id, name, dimensions }) => [
    id,
    { id, name, category: 'furniture', tags: [], src: `/items/${id}/model.glb`, thumbnail: `/items/${id}/thumbnail.webp`, dimensions },
  ]),
)
const resolve = (id: string) => ASSETS.get(id)
const dims = (id: string) => (ASSETS.get(id) as { dimensions: number[] }).dimensions

const piece = (over: Partial<DetectedFurniture> = {}): DetectedFurniture => ({
  asset_id: 'sofa',
  x: 0.5,
  y: 0.5,
  width: 0.3,
  depth: 0.2,
  rotation_deg: 0,
  confidence: 0.9,
  ...over,
})
const analysisOf = (...furniture: DetectedFurniture[]): RoomAnalysis => ({ furniture, warnings: [], calibration: { status: 'uncalibrated', width_m: null } })

function run(analysis: RoomAnalysis, opts: { knownWidthM?: number | null } = {}, find: (id: string) => unknown = resolve) {
  const warnings: string[] = []
  const definition = analysisToDefinition(analysis, find as typeof resolve, { ...opts, warn: (message) => warnings.push(message) })
  return { definition, warnings, level: definition.levels[0] as LevelDef }
}
const problems = (definition: TemplateDefinition) => validateDefinition(definition, new Set(ASSETS.keys()), MATERIAL_IDS)
const span = (o: OpeningDef): [number, number] => [o.at - o.width / 2, o.at + o.width / 2]

describe('analysisToDefinition: el ambiente', () => {
  it('arma un solo nivel con un ambiente rectangular de 4 × 3 m si no se sabe el ancho', () => {
    const { definition, level } = run(analysisOf())
    expect(definition.levels).toHaveLength(1)
    expect(definition.kind).toBe('vivienda')
    expect(level.rooms).toHaveLength(1)
    expect(level.rooms[0]?.rect).toEqual([0, 0, 4, 3])
  })

  it('con el ancho conocido, el ambiente mide ese ancho y el fondo es el 75 %', () => {
    expect(run(analysisOf(), { knownWidthM: 6 }).level.rooms[0]?.rect).toEqual([0, 0, 6, 4.5])
    expect(run(analysisOf(), { knownWidthM: 5.3 }).level.rooms[0]?.rect).toEqual([0, 0, 5.3, 3.975])
  })

  it.each([null, 0, -3, Number.NaN])('si el ancho conocido es %s, usa los 4 m', (knownWidthM) => {
    expect(run(analysisOf(), { knownWidthM }).level.rooms[0]?.rect).toEqual([0, 0, 4, 3])
  })

  it('un ancho demasiado chico se sube al mínimo y se avisa (sus muros no serían válidos)', () => {
    const { level, warnings, definition } = run(analysisOf(), { knownWidthM: 0.2 })
    expect(MIN_ROOM_WIDTH_M).toBe(1)
    expect(level.rooms[0]?.rect).toEqual([0, 0, 1, 0.75])
    expect(warnings.join(' ')).toMatch(/0,2 m/)
    expect(problems(definition)).toEqual([])
  })

  it('cierra el ambiente con cuatro muros que tienen material por dentro y por fuera', () => {
    const { level } = run(analysisOf())
    expect(level.walls.map((w) => w.id).sort()).toEqual(['p-e', 'p-n', 'p-s', 'p-w'])
    expect(level.walls.map((w) => w.name).sort()).toEqual(['Muro este', 'Muro norte', 'Muro oeste', 'Muro sur'])
    for (const material of [level.wallInside, level.wallOutside]) expect(MATERIAL_IDS.has(material as string)).toBe(true)
  })

  it('el piso es de madera clara de la biblioteca de Pascal y el cielo tiene material', () => {
    const room = run(analysisOf()).level.rooms[0]
    expect(room?.floor).toBe(FLOOR_MATERIAL)
    expect(FLOOR_MATERIAL).toMatch(/^wood-/)
    expect(MATERIAL_IDS.has(FLOOR_MATERIAL)).toBe(true)
    expect(MATERIAL_IDS.has(room?.ceiling as string)).toBe(true)
  })
})

describe('analysisToDefinition: las piezas en coordenadas absolutas', () => {
  it('el centro de la foto es el centro del ambiente', () => {
    const { level } = run(analysisOf(piece({ asset_id: 'sofa' })))
    expect(level.items).toEqual([{ asset: 'sofa', at: [2, 1.5], rotY: 0 }])
  })

  it('mantiene el orden del análisis y repite las piezas iguales', () => {
    const chair = (x: number) => piece({ asset_id: 'dining-chair', x, y: 0.5 })
    const { level } = run(analysisOf(chair(0.4), piece({ asset_id: 'coffee-table', x: 0.5, y: 0.3 }), chair(0.6)))
    expect(level.items.map((i) => i.asset)).toEqual(['dining-chair', 'coffee-table', 'dining-chair'])
    expect(level.items[0]?.at).not.toEqual(level.items[2]?.at)
  })

  it('el giro horario del análisis llega como el rotY de Pascal (antihorario)', () => {
    const { level } = run(analysisOf(piece({ rotation_deg: 90 })))
    expect(level.items[0]?.rotY).toBeCloseTo(-Math.PI / 2, 6)
  })

  it('una pieza que se saldría del ambiente se recorta a 0,2 m del muro (por su borde, no por su centro) y se avisa', () => {
    expect(WALL_CLEARANCE_M).toBe(0.2)
    const { level, warnings } = run(analysisOf(piece({ x: 0, y: 0.5 })))
    const [sofaWidth] = dims('sofa') as [number]
    expect(level.items[0]?.at[0]).toBeCloseTo(0.2 + sofaWidth / 2, 3)
    expect(level.items[0]?.at[1]).toBeCloseTo(1.5, 3)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/Sofá/)
    expect(warnings[0]).toMatch(/movió 1,23 m/)
  })

  it('la huella girada también cuenta: un sofá de costado se recorta con su fondo hacia el muro', () => {
    const [width, , depth] = dims('sofa') as [number, number, number]
    const { level } = run(analysisOf(piece({ x: 0, y: 0, rotation_deg: 90 })))
    expect(level.items[0]?.at[0]).toBeCloseTo(0.2 + depth / 2, 3)
    expect(level.items[0]?.at[1]).toBeCloseTo(0.2 + width / 2, 3)
  })

  it('una pieza que ya cabe con holgura no se mueve ni avisa', () => {
    const { level, warnings } = run(analysisOf(piece({ x: 0.5, y: 0.5 })))
    expect(level.items[0]?.at).toEqual([2, 1.5])
    expect(warnings).toEqual([])
  })

  it('un ajuste de menos de 5 cm se hace pero no se avisa: la posición de la foto no es tan precisa', () => {
    const [sofaWidth] = dims('sofa') as [number]
    const edge = 0.2 + sofaWidth / 2
    const { level, warnings } = run(analysisOf(piece({ x: (edge - 0.03) / 4, y: 0.5 })))
    expect(level.items[0]?.at[0]).toBeCloseTo(edge, 3)
    expect(warnings).toEqual([])
  })

  it('una pieza más grande que el ambiente queda en el centro y se avisa con su nombre en castellano', () => {
    const { level, warnings } = run(analysisOf(piece({ asset_id: 'double-bed', x: 0.9, y: 0.1 })), { knownWidthM: 1.5 })
    expect(level.items[0]?.at[0]).toBeCloseTo(0.75, 3)
    expect(level.items[0]?.at[1]).toBeCloseTo(0.5625, 2)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/Cama doble/)
    expect(warnings[0]).toMatch(/no cabe/)
  })

  it('si no se conocen las medidas de la pieza, se recorta su centro a 0,2 m del muro', () => {
    const { level } = run(analysisOf(piece({ x: 0, y: 1 })), {}, () => ({ id: 'sofa', name: 'Sofa' }))
    expect(level.items[0]?.at).toEqual([0.2, 2.8])
  })

  it('descarta con aviso lo que analysisToCluster descarta (confianza baja o pieza que el catálogo no tiene), sin reemplazarlo', () => {
    const { level, warnings } = run(analysisOf(piece({ confidence: 0.1 }), piece({ asset_id: 'lampara-rara' })))
    expect(level.items).toEqual([])
    expect(warnings).toHaveLength(2)
    expect(warnings.join(' ')).toMatch(/Sofá/)
    expect(warnings.join(' ')).toMatch(/lampara-rara/)
  })

  it('un análisis sin muebles da un ambiente vacío pero válido, con su puerta y su ventana', () => {
    const { definition, level } = run(analysisOf())
    expect(level.items).toEqual([])
    expect(level.openings.map((o) => o.type).sort()).toEqual(['door', 'window'])
    expect(problems(definition)).toEqual([])
  })

  it('barrido: sea cual sea la posición y el giro, ninguna huella cruza el muro y la definición es válida', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1]
    for (const asset_id of RECOGNIZABLE_IDS.filter((id) => ASSETS.has(id))) {
      const furniture = steps.flatMap((x) => steps.flatMap((y) => [0, 45, 90, 180, 270].map((rotation_deg) => piece({ asset_id, x, y, rotation_deg }))))
      const { definition, level } = run(analysisOf(...furniture))
      expect(problems(definition), asset_id).toEqual([])
      const [, , w, d] = (level.rooms[0] as RoomDef).rect
      const [width, , depth] = dims(asset_id) as [number, number, number]
      for (const item of level.items as ItemDef[]) {
        const corners = footprint(item.at, width, depth, item.rotY)
        const xs = corners.map((c) => c[0])
        const zs = corners.map((c) => c[1])
        const fits = Math.max(...xs) - Math.min(...xs) <= w - 2 * WALL_CLEARANCE_M && Math.max(...zs) - Math.min(...zs) <= d - 2 * WALL_CLEARANCE_M
        if (!fits) continue
        expect(Math.min(...xs), asset_id).toBeGreaterThanOrEqual(WALL_CLEARANCE_M - 0.002)
        expect(Math.max(...xs), asset_id).toBeLessThanOrEqual(w - WALL_CLEARANCE_M + 0.002)
        expect(Math.min(...zs), asset_id).toBeGreaterThanOrEqual(WALL_CLEARANCE_M - 0.002)
        expect(Math.max(...zs), asset_id).toBeLessThanOrEqual(d - WALL_CLEARANCE_M + 0.002)
      }
    }
  })
})

describe('analysisToDefinition: una puerta y una ventana razonables', () => {
  it('sin muebles, la ventana va al fondo (muro norte) y la puerta en el muro sur, las dos centradas', () => {
    const { level } = run(analysisOf())
    expect(level.openings).toEqual([
      { id: 'puerta', type: 'door', wall: 'p-s', at: 2, width: 0.9, name: 'Puerta' },
      { id: 'ventana', type: 'window', wall: 'p-n', at: 2, width: 1.4, name: 'Ventana' },
    ])
  })

  it('la puerta no queda detrás de un mueble pegado a su muro', () => {
    // Una biblioteca contra el centro del muro sur: la puerta se corre a un lado (o pasa a otro muro).
    const { level, definition } = run(analysisOf(piece({ asset_id: 'bookshelf', x: 0.5, y: 1, rotation_deg: 180 })))
    const door = level.openings.find((o) => o.type === 'door') as OpeningDef
    const shelf = level.items[0] as ItemDef
    const [width, , depth] = dims('bookshelf') as [number, number, number]
    const [from, to] = span(door)
    // La biblioteca (pegada al muro sur, a 0,2 m de su eje) ocupa de `shelf.at[0] ± width / 2` a lo largo de ese muro.
    expect(shelf.at[1]).toBeCloseTo(3 - 0.2 - depth / 2, 3)
    expect(door.wall === 'p-s' && from < shelf.at[0] + width / 2 && to > shelf.at[0] - width / 2).toBe(false)
    expect(problems(definition)).toEqual([])
  })

  it('en un ambiente chico la puerta y la ventana se ajustan al muro, y la definición sigue siendo válida', () => {
    const { level, definition } = run(analysisOf(), { knownWidthM: 2 })
    expect(level.openings.map((o) => o.type).sort()).toEqual(['door', 'window'])
    for (const o of level.openings) expect(o.width).toBeLessThanOrEqual(2 - 0.6)
    expect(problems(definition)).toEqual([])
  })

  it('en un ambiente diminuto no pone aberturas que no caben (y no falla)', () => {
    const { level, definition } = run(analysisOf(), { knownWidthM: 1 })
    expect(level.openings).toEqual([])
    expect(problems(definition)).toEqual([])
  })

  it('la ventana y la puerta no se pisan aunque compartan muro', () => {
    // Bibliotecas en fila pegadas al norte, al este y al oeste de un ambiente de 8 × 6 m: solo el muro sur queda libre.
    const row = (at: (t: number) => Partial<DetectedFurniture>) => Array.from({ length: 11 }, (_, i) => piece({ asset_id: 'bookshelf', ...at(i / 10) }))
    const wallHuggers = [
      ...row((t) => ({ x: t, y: 0, rotation_deg: 0 })),
      ...row((t) => ({ x: 0, y: t, rotation_deg: 90 })),
      ...row((t) => ({ x: 1, y: t, rotation_deg: 270 })),
    ]
    const { level, definition } = run(analysisOf(...wallHuggers), { knownWidthM: 8 })
    const door = level.openings.find((o) => o.type === 'door') as OpeningDef
    const window = level.openings.find((o) => o.type === 'window') as OpeningDef
    expect([door.wall, window.wall]).toEqual(['p-s', 'p-s'])
    const [first, second] = [span(door), span(window)].sort((a, b) => a[0] - b[0]) as [[number, number], [number, number]]
    expect(second[0] - first[1]).toBeGreaterThanOrEqual(0.2 - 1e-6) // un hueco de pared entre las dos
    expect(problems(definition)).toEqual([])
  })
})

describe('analysisToDefinition: lo que Pascal necesita', () => {
  const sample = run(SAMPLE_ANALYSIS)

  it('el análisis de ejemplo pasa el validador de plantillas con las piezas y materiales reales', () => {
    expect(problems(sample.definition)).toEqual([])
  })

  it('el ejemplo trae seis muebles (la planta de confianza baja se descarta con aviso) y avisa lo que recortó', () => {
    expect(sample.level.items.map((i) => i.asset)).toEqual(['television', 'coffee-table', 'sofa', 'dining-chair', 'bookshelf', 'double-bed'])
    expect(sample.warnings.some((m) => /Planta de interior/.test(m))).toBe(true)
    expect(sample.warnings.some((m) => /Cama doble/.test(m) && /movió/.test(m))).toBe(true)
  })

  it('Pascal lo dibuja: buildLabEnvelope arma una zona, una losa, un cielo, cuatro muros, dos aberturas y los muebles', () => {
    const envelope = buildLabEnvelope(sample.definition, ASSETS as never)
    const counts: Record<string, number> = {}
    for (const node of Object.values(envelope.graph.nodes) as { type: string }[]) counts[node.type] = (counts[node.type] ?? 0) + 1
    expect(counts).toMatchObject({ level: 1, zone: 1, slab: 1, ceiling: 1, wall: 4, door: 1, window: 1, item: 6 })
  })

  it('es determinista: el mismo análisis da la misma definición', () => {
    expect(run(SAMPLE_ANALYSIS).definition).toEqual(sample.definition)
  })
})

describe('analysisToDefinition: siempre se puede dibujar (puerta y ventana nunca se pisan)', () => {
  it('con muebles pegados a los cuatro muros la definición sigue siendo válida', () => {
    const ids = [...ASSETS.keys()].filter((id) => (RECOGNIZABLE_IDS as readonly string[]).includes(id)).slice(0, 14)
    const edges: [number, number][] = [[0.04, 0.3], [0.04, 0.7], [0.96, 0.3], [0.96, 0.7], [0.3, 0.04], [0.7, 0.04], [0.3, 0.96], [0.7, 0.96], [0.5, 0.04], [0.5, 0.96], [0.04, 0.5], [0.96, 0.5]]
    for (const knownWidthM of [null, 2, 3, 4.5, 8]) {
      const furniture = ids.slice(0, edges.length).map((asset_id, i) => piece({ asset_id, x: (edges[i] as [number, number])[0], y: (edges[i] as [number, number])[1] }))
      const { definition } = run(analysisOf(...furniture), { knownWidthM })
      const level = definition.levels[0] as LevelDef
      const errors = validateDefinition(definition, new Set(ASSETS.keys()), MATERIAL_IDS)
      expect(errors, `ancho ${knownWidthM}`).toEqual([])
      expect(level.openings?.some((o) => o.type === 'door')).toBe(true)
    }
  })
})
