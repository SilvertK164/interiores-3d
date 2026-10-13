import { describe, expect, it } from 'vitest'
import { WALL_FACE_M } from '../src/lib/lab/layout-constants'
import { EDGE_M, solveLayout } from '../src/lib/lab/layout-solver'
import type { DetectedFurniture, RoomAnalysis } from '../src/lib/lab/schema'
import { boxOf, dims, opening, overlaps, piece, planOf, resolve } from './support/layout'

// El caso de la foto: un salón largo y angosto (3,2 × 7 m) visto desde el extremo sur: la tele sobre su mueble contra el muro del fondo, el
// sofá frente a ella, la mesa de centro y la alfombra al medio, una planta y un sillón a los lados y una ventana a la derecha (este).

const HALL_ROOM = { width_m: 3.2, depth_m: 7 }
const HALL_OPENINGS = [opening({ type: 'window', wall: 'e', at_m: 2, width_m: 1.4 }), opening({ type: 'door', wall: 'w', at_m: 1, width_m: 0.9 })]
const hall = (furniture: DetectedFurniture[], over: Partial<RoomAnalysis> = {}) =>
  planOf(furniture, { room: HALL_ROOM, camera: { x_m: 1.6, z_m: 6.8, look_at: { x_m: 1.6, z_m: 0 } }, openings: HALL_OPENINGS, ...over })

const HALL: DetectedFurniture[] = [
  piece({ asset_id: 'tv-stand', x_m: 1.6, z_m: 0.31, facing_deg: 0, against_wall: 'n', confidence: 0.9 }),
  piece({ asset_id: 'television', x_m: 1.6, z_m: 0.31, facing_deg: 0, on_top_of: 0, confidence: 0.95 }),
  piece({ asset_id: 'rectangular-carpet', x_m: 1.6, z_m: 3, confidence: 0.85 }),
  piece({ asset_id: 'coffee-table', x_m: 1.6, z_m: 3, confidence: 0.9 }),
  piece({ asset_id: 'sofa', x_m: 1.6, z_m: 4.9, facing_deg: 180, confidence: 0.92 }),
  piece({ asset_id: 'indoor-plant', x_m: 0.55, z_m: 1.4, confidence: 0.7 }),
  piece({ asset_id: 'livingroom-chair', x_m: 2.5, z_m: 1.7, facing_deg: 90, against_wall: 'e', confidence: 0.8 }),
]

const byId = (result: ReturnType<typeof solveLayout>, id: string) => {
  const found = result.pieces.find((p) => p.asset.id === id)
  if (!found) throw new Error(`no hay ${id}`)
  return found
}
const boxFor = (p: ReturnType<typeof solveLayout>['pieces'][number]) => boxOf(p.asset.id, p.x, p.z, p.facingDeg)
/** Lo del piso queda a 0,15 m de los bordes; lo apoyado puede sobresalir un poco de su soporte, pero nunca cruza la cara del muro (0,1 m). */
const marginOf = (p: ReturnType<typeof solveLayout>['pieces'][number]) => (p.supportedBy === null ? EDGE_M : WALL_FACE_M)

describe('el salón largo y angosto (3,2 × 7 m)', () => {
  const result = solveLayout(hall(HALL), resolve)

  it('lo que Gemini dio bien queda como está, sin avisos', () => {
    expect(result.room).toEqual({ width: 3.2, depth: 7 })
    expect(result.pieces).toHaveLength(7)
    expect(result.warnings).toEqual([])
    expect(byId(result, 'tv-stand')).toMatchObject({ x: 1.6, z: 0.31, y: 0, facingDeg: 0 })
    expect(byId(result, 'sofa')).toMatchObject({ x: 1.6, z: 4.9, y: 0, facingDeg: 180 })
    expect(byId(result, 'coffee-table')).toMatchObject({ x: 1.6, z: 3 })
    expect(byId(result, 'rectangular-carpet')).toMatchObject({ x: 1.6, z: 3 })
  })

  it('la tele está contra el muro del fondo, sobre su mueble (0,35 m) y mirando hacia la sala', () => {
    const tv = byId(result, 'television')
    expect(tv.y).toBe(0.35)
    expect([tv.x, tv.z]).toEqual([1.6, 0.31])
    expect(tv.facingDeg).toBe(0)
    expect(result.pieces[tv.supportedBy as number]?.asset.id).toBe('tv-stand')
    expect(byId(result, 'tv-stand').againstWall).toBe('n')
  })

  it('el sofá mira a la tele (hacia el norte, -z) a través de la mesa de centro', () => {
    const sofa = byId(result, 'sofa')
    expect(sofa.facingDeg).toBe(180)
    expect(Math.round(Math.cos(sofa.rotY))).toBe(-1)
    expect(sofa.z).toBeGreaterThan(byId(result, 'coffee-table').z)
    expect(sofa.z).toBeGreaterThan(byId(result, 'television').z)
  })

  it('la alfombra queda bajo la mesa y la mesa y la alfombra se pisan sin que nadie se mueva', () => {
    const rug = byId(result, 'rectangular-carpet')
    const table = byId(result, 'coffee-table')
    expect(overlaps(boxFor(rug), boxFor(table), 0.5)).toBe(true)
    expect([rug.x, rug.z]).toEqual([table.x, table.z])
  })

  it('el sillón contra el muro este (el de la ventana) mira hacia el oeste', () => {
    const chair = byId(result, 'livingroom-chair')
    expect(chair.facingDeg).toBe(90)
    expect(chair.x).toBeCloseTo(3.2 - EDGE_M - 1.07 / 2, 2)
  })

  it('ninguna pieza se sale del ambiente ni cruza un muro (0,15 m desde el borde del rectángulo) y ninguna sólida se pisa con otra', () => {
    const solid = result.pieces.filter((p) => p.asset.id !== 'rectangular-carpet' && p.supportedBy === null)
    for (const p of result.pieces) {
      const [x0, x1, z0, z1] = boxFor(p)
      expect(x0, p.asset.id).toBeGreaterThanOrEqual(marginOf(p) - 1e-6)
      expect(x1, p.asset.id).toBeLessThanOrEqual(3.2 - marginOf(p) + 1e-6)
      expect(z0, p.asset.id).toBeGreaterThanOrEqual(marginOf(p) - 1e-6)
      expect(z1, p.asset.id).toBeLessThanOrEqual(7 - marginOf(p) + 1e-6)
    }
    for (let i = 0; i < solid.length; i++) {
      for (let j = i + 1; j < solid.length; j++) {
        expect(overlaps(boxFor(solid[i] as never), boxFor(solid[j] as never)), `${solid[i]?.asset.id} y ${solid[j]?.asset.id}`).toBe(false)
      }
    }
  })

  it('conserva la ventana a la derecha (muro este) y la puerta del muro oeste, cada una en su lugar', () => {
    expect(result.openings).toEqual([
      { type: 'window', wall: 'e', at: 2, width: 1.4 },
      { type: 'door', wall: 'w', at: 1, width: 0.9 },
    ])
  })
})

describe('el mismo salón con los errores típicos de la foto', () => {
  const sloppy: DetectedFurniture[] = [
    piece({ asset_id: 'tv-stand', x_m: 1.7, z_m: 0.7, facing_deg: 0, against_wall: 'n', confidence: 0.9 }), // despegado del muro
    piece({ asset_id: 'television', x_m: 1.7, z_m: 0.7, facing_deg: 180, on_top_of: 0, confidence: 0.95 }), // mirando al revés
    piece({ asset_id: 'rectangular-carpet', x_m: 1.6, z_m: 3, confidence: 0.85 }),
    piece({ asset_id: 'coffee-table', x_m: 1.6, z_m: 4.1, confidence: 0.9 }), // pisando al sofá
    piece({ asset_id: 'sofa', x_m: 1.6, z_m: 5, facing_deg: 0, confidence: 0.92 }), // de espaldas a la tele
    piece({ asset_id: 'indoor-plant', x_m: 0.2, z_m: 1.4, confidence: 0.7 }), // medio afuera
    piece({ asset_id: 'livingroom-chair', x_m: 2.9, z_m: 1.7, facing_deg: 270, against_wall: 'e', confidence: 0.8 }), // mirando al muro
    piece({ asset_id: 'floor-lamp', x_m: 9, z_m: 2, confidence: 0.6 }), // fuera del ambiente
  ]
  const result = solveLayout(hall(sloppy), resolve)

  it('la tele queda contra el muro sobre su mueble y el sofá mira a la mesa y a la tele', () => {
    expect(byId(result, 'tv-stand').z).toBeCloseTo(0.31, 2)
    expect(byId(result, 'television')).toMatchObject({ y: 0.35, facingDeg: 0 })
    expect(byId(result, 'sofa').facingDeg).toBe(180)
  })

  it('se pega, se endereza, se mete adentro o se saca lo que estaba mal, y cada corrección grande se avisa en castellano', () => {
    expect(byId(result, 'livingroom-chair').facingDeg).toBe(90)
    expect(result.pieces.map((p) => p.asset.id)).not.toContain('floor-lamp')
    expect(result.warnings.some((w) => /Lámpara de pie/.test(w) && /fuera del ambiente/.test(w))).toBe(true)
    expect(result.warnings.some((w) => /Sofá/.test(w))).toBe(true)
    for (const w of result.warnings) expect(w.length).toBeGreaterThan(10)
  })

  it('al final nada se sale, nada se pisa y todo lo apoyado sigue sobre su soporte', () => {
    const solid = result.pieces.filter((p) => p.asset.id !== 'rectangular-carpet' && p.supportedBy === null)
    for (const p of result.pieces) {
      const [x0, x1, z0, z1] = boxFor(p)
      expect(x0, p.asset.id).toBeGreaterThanOrEqual(marginOf(p) - 1e-6)
      expect(x1, p.asset.id).toBeLessThanOrEqual(3.2 - marginOf(p) + 1e-6)
      expect(z0, p.asset.id).toBeGreaterThanOrEqual(marginOf(p) - 1e-6)
      expect(z1, p.asset.id).toBeLessThanOrEqual(7 - marginOf(p) + 1e-6)
    }
    for (let i = 0; i < solid.length; i++) {
      for (let j = i + 1; j < solid.length; j++) expect(overlaps(boxFor(solid[i] as never), boxFor(solid[j] as never))).toBe(false)
    }
    const tv = byId(result, 'television')
    expect(tv.x).toBeCloseTo(byId(result, 'tv-stand').x, 1)
  })
})

describe('casos límite', () => {
  it('todo solapado en el mismo punto: se reparte dentro del ambiente y nada queda pisado', () => {
    const ids = ['sofa', 'coffee-table', 'livingroom-chair', 'indoor-plant', 'bookshelf', 'floor-lamp', 'dresser']
    const pile = ids.map((asset_id, i) => piece({ asset_id, x_m: 3.5, z_m: 3, confidence: 0.9 - i * 0.05 }))
    const result = solveLayout(planOf(pile, { room: { width_m: 7, depth_m: 6 } }), resolve)
    expect(result.pieces).toHaveLength(ids.length)
    const boxes = result.pieces.map(boxFor)
    boxes.forEach((box, i) => {
      expect(box[0]).toBeGreaterThanOrEqual(EDGE_M - 1e-6)
      expect(box[1]).toBeLessThanOrEqual(7 - EDGE_M + 1e-6)
      expect(box[2]).toBeGreaterThanOrEqual(EDGE_M - 1e-6)
      expect(box[3]).toBeLessThanOrEqual(6 - EDGE_M + 1e-6)
      for (let j = i + 1; j < boxes.length; j++) expect(overlaps(box, boxes[j] as never), `${ids[i]} y ${ids[j]}`).toBe(false)
    })
  })

  it('todas las piezas fuera del ambiente: no queda ninguna y hay un aviso por cada una', () => {
    const out = [piece({ x_m: 11, z_m: 1 }), piece({ asset_id: 'bookshelf', x_m: -0.9, z_m: 2 }), piece({ asset_id: 'cactus', x_m: 2, z_m: 12 })]
    const result = solveLayout(planOf(out, { room: { width_m: 4, depth_m: 3 } }), resolve)
    expect(result.pieces).toEqual([])
    expect(result.warnings).toHaveLength(3)
  })

  it('el ambiente mínimo (1,5 × 1,5 m): entra lo chico, lo grande se saca con aviso, y nada se sale', () => {
    const items = [piece({ asset_id: 'cactus', x_m: 0.75, z_m: 0.75 }), piece({ asset_id: 'sofa', x_m: 0.75, z_m: 0.75 }), piece({ asset_id: 'bookshelf', x_m: 0.75, z_m: 0.75 })]
    const result = solveLayout(planOf(items, { room: { width_m: 1.5, depth_m: 1.5 } }), resolve)
    expect(result.room).toEqual({ width: 1.5, depth: 1.5 })
    expect(result.pieces.map((p) => p.asset.id)).toEqual(['cactus', 'bookshelf'])
    expect(result.warnings.some((w) => /Sofá/.test(w) && /no cabe/.test(w))).toBe(true)
    for (const p of result.pieces) {
      const [x0, x1, z0, z1] = boxFor(p)
      expect(Math.min(x0, z0)).toBeGreaterThanOrEqual(EDGE_M - 1e-6)
      expect(Math.max(x1, z1)).toBeLessThanOrEqual(1.5 - EDGE_M + 1e-6)
    }
  })

  it('sin puertas ni ventanas todo se acomoda igual, sin avisos de aberturas', () => {
    const result = solveLayout(hall(HALL, { openings: [] }), resolve)
    expect(result.openings).toEqual([])
    expect(result.pieces).toHaveLength(7)
    expect(result.warnings).toEqual([])
  })

  it('un solo mueble sin nada más: queda donde está, a escuadra', () => {
    const result = solveLayout(planOf([piece({ asset_id: 'dining-table', x_m: 2, z_m: 1.5, facing_deg: 4 })]), resolve)
    expect(result.pieces[0]).toMatchObject({ x: 2, z: 1.5, facingDeg: 0, y: 0 })
    expect(dims('dining-table')).toEqual([result.pieces[0]?.width, result.pieces[0]?.height, result.pieces[0]?.depth])
  })
})
