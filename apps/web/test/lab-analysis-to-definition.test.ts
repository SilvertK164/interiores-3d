import { describe, expect, it } from 'vitest'
import { buildLabEnvelope } from '../src/editor/lab-scene'
import { MATERIAL_IDS } from '../src/editor/templates/scene-builder'
import { FLOOR_MATERIAL, analysisToDefinition } from '../src/lib/lab/analysis-to-definition'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import type { DetectedFurniture, RoomAnalysis } from '../src/lib/lab/schema'
import type { LevelDef, TemplateDefinition } from '../src/lib/templates/types'
import { validateDefinition } from '../src/lib/templates/validate'
import { ASSETS as SOLVER_ASSETS, opening, piece, planOf } from './support/layout'
import { randomPlan } from './support/random-plan'

// analysisToDefinition: del plano de Gemini (ya acomodado por `solveLayout`) al ambiente que abre «Escena desde una foto»: un nivel con el
// ambiente del tamaño que dijo Gemini, sus cuatro muros, las puertas y ventanas en los muros que dijo, y los muebles con su giro y su altura.
// Se prueba con las piezas reales del catálogo local (sus medidas salen de Pascal), el validador de plantillas y `buildLabEnvelope` de verdad.

const ASSETS = new Map(
  [...SOLVER_ASSETS.values()].map(({ id, name, dimensions }) => [
    id,
    { id, name, category: 'furniture', tags: [], src: `/items/${id}/model.glb`, thumbnail: `/items/${id}/thumbnail.webp`, dimensions },
  ]),
)
const resolve = (id: string) => ASSETS.get(id)

function run(analysis: RoomAnalysis, find: (id: string) => unknown = resolve) {
  const warnings: string[] = []
  const definition = analysisToDefinition(analysis, find as typeof resolve, { warn: (message) => warnings.push(message) })
  return { definition, warnings, level: definition.levels[0] as LevelDef }
}
const analysisOf = (furniture: DetectedFurniture[] = [], over: Partial<RoomAnalysis> = {}) => planOf(furniture, over)
const problems = (definition: TemplateDefinition) => validateDefinition(definition, new Set(ASSETS.keys()), MATERIAL_IDS)

describe('analysisToDefinition: el ambiente es el que dijo Gemini', () => {
  it('arma un solo nivel con un ambiente rectangular de ancho × fondo del plano, con el origen en la esquina noroeste', () => {
    const { definition, level } = run(analysisOf([], { room: { width_m: 3.2, depth_m: 7 } }))
    expect(definition.levels).toHaveLength(1)
    expect(definition.kind).toBe('vivienda')
    expect(level.rooms).toHaveLength(1)
    expect(level.rooms[0]?.rect).toEqual([0, 0, 3.2, 7])
  })

  it('ya no inventa 4 × 3 m ni usa un ancho del formulario: cada ambiente mide lo del plano', () => {
    for (const [w, d] of [[4, 3], [6.5, 2.4], [1.5, 1.5], [12, 12]] as const) {
      expect(run(analysisOf([], { room: { width_m: w, depth_m: d } })).level.rooms[0]?.rect).toEqual([0, 0, w, d])
    }
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

  it('un plano vacío da un ambiente vacío pero válido, sin avisos', () => {
    const { definition, level, warnings } = run(analysisOf())
    expect(level.items).toEqual([])
    expect(level.openings).toEqual([])
    expect(warnings).toEqual([])
    expect(problems(definition)).toEqual([])
  })
})

describe('analysisToDefinition: puertas y ventanas en los muros que dijo Gemini', () => {
  const at = (...openings: ReturnType<typeof opening>[]) => run(analysisOf([], { room: { width_m: 4, depth_m: 3 }, openings })).level.openings

  it('cada una va en su muro con la posición medida desde el inicio de ese muro en la definición (la distancia al centro)', () => {
    // Gemini mide desde la esquina izquierda mirando el muro desde dentro; el muro de la definición va de oeste a este (norte y sur) y de norte a sur (este y oeste).
    const found = at(
      opening({ type: 'door', wall: 'n', at_m: 1 }), //   norte: desde el oeste → 1
      opening({ type: 'window', wall: 'e', at_m: 1.2, width_m: 1 }), // este: desde el norte → 1,2
      opening({ type: 'door', wall: 's', at_m: 1 }), //   sur: desde el este → 4 − 1 = 3
      opening({ type: 'window', wall: 'w', at_m: 0.9, width_m: 1 }), // oeste: desde el sur → 3 − 0,9 = 2,1
    )
    expect(found.map((o) => [o.type, o.wall, o.at, o.width])).toEqual([
      ['door', 'p-n', 1, 0.9],
      ['window', 'p-e', 1.2, 1],
      ['door', 'p-s', 3, 0.9],
      ['window', 'p-w', 2.1, 1],
    ])
  })

  it('tienen nombre en castellano e ids únicos aunque haya varias del mismo tipo', () => {
    const found = at(opening({ type: 'window', wall: 'n', at_m: 1, width_m: 0.8 }), opening({ type: 'window', wall: 'n', at_m: 3, width_m: 0.8 }), opening({ type: 'door', wall: 's' }))
    expect(new Set(found.map((o) => o.id)).size).toBe(3)
    expect(found.map((o) => o.name)).toEqual(['Ventana 1', 'Ventana 2', 'Puerta'])
  })

  it('se acomodan: la abertura que no cabe en el muro se achica, y las que se pisan no se pisan', () => {
    const found = at(opening({ type: 'window', wall: 'n', at_m: 2, width_m: 9 }), opening({ type: 'door', wall: 'n', at_m: 2 }))
    expect(found.length).toBeLessThanOrEqual(2)
    for (const o of found) expect(o.at - o.width / 2).toBeGreaterThanOrEqual(0.3 - 1e-9)
    expect(problems(run(analysisOf([], { openings: [opening({ type: 'window', wall: 'n', at_m: 2, width_m: 9 }), opening({ type: 'door', wall: 'n', at_m: 2 })] })).definition)).toEqual([])
  })

  it('sin aberturas en el plano, el ambiente no lleva ninguna (no se inventa una puerta)', () => {
    expect(at()).toEqual([])
  })
})

describe('analysisToDefinition: los muebles en sus posiciones, con su giro y su altura', () => {
  const room = { width_m: 4, depth_m: 3 }

  it('cada pieza va en su centro (x, z) en metros, con el rotY de Pascal y sin altura si está en el piso', () => {
    const { level } = run(analysisOf([piece({ asset_id: 'sofa', x_m: 2, z_m: 1.5, facing_deg: 90 })], { room }))
    expect(level.items).toHaveLength(1)
    const sofa = level.items[0]
    expect(sofa?.asset).toBe('sofa')
    expect(sofa?.at).toEqual([2, 1.5])
    expect(sofa?.rotY).toBeCloseTo(-Math.PI / 2, 10) // el giro horario de Gemini es el rotY antihorario de Pascal
    expect(sofa).not.toHaveProperty('y')
  })

  it('lo apoyado sobre otra pieza sube a la altura real de su soporte (y)', () => {
    const stand = piece({ asset_id: 'tv-stand', x_m: 2, z_m: 0.31, against_wall: 'n' })
    const tv = piece({ asset_id: 'television', x_m: 2, z_m: 0.31, on_top_of: 0 })
    const { level } = run(analysisOf([stand, tv], { room }))
    const [first, second] = level.items
    expect(first).not.toHaveProperty('y')
    expect(second?.asset).toBe('television')
    expect(second?.y).toBe(0.35)
    expect(second?.at).toEqual(first?.at)
  })

  it('con el rotY de Pascal el frente apunta a donde dice facing_deg (0 al sur, 90 al oeste, 180 al norte, 270 al este)', () => {
    const front = (facing_deg: number) => {
      const rotY = run(analysisOf([piece({ asset_id: 'floor-lamp', x_m: 2, z_m: 1.5, facing_deg })], { room })).level.items[0]?.rotY ?? 0
      return [Math.round(Math.sin(rotY)) + 0, Math.round(Math.cos(rotY)) + 0]
    }
    expect([front(0), front(90), front(180), front(270)]).toEqual([[0, 1], [-1, 0], [0, -1], [1, 0]])
  })

  it('usa el plano ya acomodado: lo pegado a un muro se arrima y mira hacia adentro, lo que se pasa se mete y lo de afuera se saca (con aviso)', () => {
    const items = [piece({ asset_id: 'sofa', x_m: 2, z_m: 1, against_wall: 's' }), piece({ asset_id: 'bookshelf', x_m: 4.1, z_m: 1.5 }), piece({ asset_id: 'cactus', x_m: 9, z_m: 1 })]
    const { level, warnings } = run(analysisOf(items, { room }))
    expect(level.items.map((i) => i.asset)).toEqual(['sofa', 'bookshelf'])
    expect(level.items[0]?.at).toEqual([2, 2.345])
    expect(level.items[0]?.rotY).toBeCloseTo(Math.PI, 10)
    expect(warnings.some((m) => /Cactus/.test(m) && /fuera del ambiente/.test(m))).toBe(true)
    expect(warnings.some((m) => /Sofá/.test(m) && /muro sur/.test(m))).toBe(true)
  })

  it('los avisos del acomodador llegan por warn y nada más (sin warn no falla)', () => {
    expect(() => analysisToDefinition(analysisOf([piece({ asset_id: 'cactus', x_m: 9, z_m: 1 })], { room }), resolve)).not.toThrow()
  })

  it('descarta con aviso lo que el catálogo no tiene o tiene confianza baja, sin reemplazarlo', () => {
    const { level, warnings } = run(analysisOf([piece({ asset_id: 'lampara-rara' }), piece({ asset_id: 'sofa', confidence: 0.1 }), piece({ asset_id: 'cactus', x_m: 2, z_m: 1 })], { room }))
    expect(level.items.map((i) => i.asset)).toEqual(['cactus'])
    expect(warnings).toHaveLength(2)
  })

  it('un mueble sin dimensiones conocidas se dibuja igual (1 × 1 × 1 m)', () => {
    const { level, definition } = run(analysisOf([piece({ asset_id: 'cactus', x_m: 2, z_m: 1.5 })], { room }), (id) => ({ id, name: 'Cactus' }))
    expect(level.items).toHaveLength(1)
    expect(definition.levels).toHaveLength(1)
  })
})

describe('analysisToDefinition: lo que Pascal necesita', () => {
  const sample = run(SAMPLE_ANALYSIS)

  it('el análisis de ejemplo pasa el validador de plantillas con las piezas y materiales reales', () => {
    expect(problems(sample.definition)).toEqual([])
  })

  it('el ejemplo trae ocho muebles (la planta de confianza baja se descarta con aviso), una puerta y una ventana, y no necesita corregir nada más', () => {
    expect(sample.level.items.map((i) => i.asset)).toEqual(['tv-stand', 'television', 'rectangular-carpet', 'coffee-table', 'sofa', 'livingroom-chair', 'bookshelf', 'floor-lamp'])
    expect(sample.level.openings.map((o) => o.type).sort()).toEqual(['door', 'window'])
    expect(sample.warnings).toHaveLength(1)
    expect(sample.warnings[0]).toMatch(/Planta de interior/)
  })

  it('Pascal lo dibuja: buildLabEnvelope arma una zona, una losa, un cielo, cuatro muros, las aberturas y los muebles', () => {
    const envelope = buildLabEnvelope(sample.definition, ASSETS as never)
    const counts: Record<string, number> = {}
    for (const node of Object.values(envelope.graph.nodes) as { type: string }[]) counts[node.type] = (counts[node.type] ?? 0) + 1
    expect(counts).toMatchObject({ level: 1, zone: 1, slab: 1, ceiling: 1, wall: 4, door: 1, window: 1, item: 8 })
  })

  it('es determinista: el mismo análisis da la misma definición', () => {
    expect(run(SAMPLE_ANALYSIS).definition).toEqual(sample.definition)
  })
})

describe('analysisToDefinition: siempre se puede dibujar', () => {
  it('con 300 planos al azar (piezas por todos lados, giros raros, aberturas de cualquier muro) la definición es válida y Pascal la dibuja', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { definition } = run(randomPlan(seed))
      expect(problems(definition), `semilla ${seed}`).toEqual([])
    }
    const envelope = buildLabEnvelope(run(randomPlan(7)).definition, ASSETS as never)
    expect(Object.keys(envelope.graph.nodes).length).toBeGreaterThan(8)
  })
})
