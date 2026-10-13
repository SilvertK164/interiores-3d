import { describe, expect, it } from 'vitest'
import { EDGE_M, solveLayout } from '../src/lib/lab/layout-solver'
import { WALL_FACE_M } from '../src/lib/lab/layout-constants'
import type { DetectedFurniture, RoomAnalysis, RoomOpening } from '../src/lib/lab/schema'
import { ASSETS, dims, resolve } from './support/layout'

// Barrido: cientos de planos al azar (con una semilla fija, así que siempre son los mismos) y lo que el acomodador promete en todos: no
// falla, es determinista, nada del piso se sale del ambiente, lo apoyado queda a la altura de su soporte, las aberturas caben en su muro y
// no se pisan, y si no avisó de un conflicto sin resolver, nada sólido se pisa ni tapa una puerta.

const IDS = ['sofa', 'coffee-table', 'tv-stand', 'television', 'livingroom-chair', 'bookshelf', 'indoor-plant', 'floor-lamp', 'dining-table', 'dining-chair', 'dresser', 'closet', 'rectangular-carpet', 'cactus']
const WALLS = ['n', 's', 'e', 'w'] as const

/** Un generador congruencial lineal: los mismos números en cada corrida. */
function lcg(seed: number) {
  let state = seed
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
  return { next, between: (a: number, b: number) => a + next() * (b - a), pick: <T>(list: readonly T[]) => list[Math.floor(next() * list.length)] as T }
}

function randomPlan(seed: number): RoomAnalysis {
  const rnd = lcg(seed)
  const room = { width_m: rnd.between(1.5, 9), depth_m: rnd.between(1.5, 9) }
  const count = Math.floor(rnd.between(0, 13))
  const furniture: DetectedFurniture[] = Array.from({ length: count }, (_, index) => ({
    asset_id: rnd.pick(IDS),
    x_m: rnd.between(-0.4, room.width_m + 0.4),
    z_m: rnd.between(-0.4, room.depth_m + 0.4),
    facing_deg: rnd.between(-360, 360),
    against_wall: rnd.next() < 0.3 ? rnd.pick(WALLS) : null,
    on_top_of: index > 0 && rnd.next() < 0.2 ? Math.floor(rnd.between(0, index)) : null,
    confidence: rnd.between(0.1, 1),
  }))
  const openings: RoomOpening[] = Array.from({ length: Math.floor(rnd.between(0, 4)) }, () => ({
    type: rnd.next() < 0.5 ? 'door' : 'window',
    wall: rnd.pick(WALLS),
    at_m: rnd.between(0, 9),
    width_m: rnd.between(0.4, 3),
  }))
  return { room, camera: { x_m: room.width_m / 2, z_m: room.depth_m, look_at: { x_m: room.width_m / 2, z_m: 0 } }, openings, furniture, warnings: [] }
}

/** La huella axial o girada (con su caja envolvente) de una pieza ya acomodada. */
function box(piece: { asset: { id: string }; x: number; z: number; facingDeg: number }): [number, number, number, number] {
  const [w, , d] = dims(piece.asset.id)
  const rad = (piece.facingDeg * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  const hx = (c * w + s * d) / 2
  const hz = (s * w + c * d) / 2
  return [piece.x - hx, piece.x + hx, piece.z - hz, piece.z + hz]
}

const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1)
/** Las posiciones salen redondeadas al milímetro: esa es la tolerancia al comparar contra un borde. */
const MM = 1e-3

describe('barrido de planos al azar', () => {
  it('no falla, es determinista y no toca el plano de entrada', () => {
    for (const seed of SEEDS) {
      const plan = randomPlan(seed)
      const copy = JSON.stringify(plan)
      const a = solveLayout(plan, resolve)
      expect(JSON.stringify(plan), `semilla ${seed}`).toBe(copy)
      expect(solveLayout(plan, resolve), `semilla ${seed}`).toEqual(a)
    }
  })

  it('todo lo del piso queda dentro del ambiente (a 0,15 m de los bordes) y lo apoyado, sin cruzar la cara del muro', () => {
    for (const seed of SEEDS) {
      const result = solveLayout(randomPlan(seed), resolve)
      for (const piece of result.pieces) {
        const margin = piece.supportedBy === null ? EDGE_M : WALL_FACE_M
        const [x0, x1, z0, z1] = box(piece)
        const where = `semilla ${seed}, ${piece.asset.id}`
        expect(x0, where).toBeGreaterThanOrEqual(margin - MM)
        expect(z0, where).toBeGreaterThanOrEqual(margin - MM)
        expect(x1, where).toBeLessThanOrEqual(result.room.width - margin + MM)
        expect(z1, where).toBeLessThanOrEqual(result.room.depth - margin + MM)
      }
    }
  })

  it('lo apoyado queda a la altura de su soporte y las posiciones y giros salen limpios', () => {
    for (const seed of SEEDS) {
      const result = solveLayout(randomPlan(seed), resolve)
      const sources = result.pieces.map((p) => p.source)
      expect(sources, `semilla ${seed}`).toEqual([...new Set(sources)].sort((a, b) => a - b))
      for (const piece of result.pieces) {
        const where = `semilla ${seed}, ${piece.asset.id}`
        for (const n of [piece.x, piece.z, piece.y, piece.rotY, piece.facingDeg]) {
          expect(Number.isFinite(n), where).toBe(true)
          expect(Object.is(n, -0), where).toBe(false)
        }
        expect(piece.facingDeg, where).toBeGreaterThanOrEqual(0)
        expect(piece.facingDeg, where).toBeLessThan(360)
        expect(piece.rotY, where).toBeGreaterThan(-Math.PI - 1e-9)
        expect(piece.rotY, where).toBeLessThanOrEqual(Math.PI + 1e-9)
        expect([piece.width, piece.height, piece.depth], where).toEqual(dims(piece.asset.id))
        if (piece.supportedBy === null) expect(piece.y, where).toBe(0)
        else {
          const support = result.pieces[piece.supportedBy]
          expect(support, where).toBeDefined()
          expect(support, where).not.toBe(piece)
          expect(piece.y, where).toBeCloseTo((support?.y ?? 0) + (support?.height ?? 0), 2)
        }
      }
    }
  })

  it('las aberturas caben en su muro (a 0,3 m de cada esquina) y las del mismo muro no se pisan', () => {
    for (const seed of SEEDS) {
      const result = solveLayout(randomPlan(seed), resolve)
      for (const [i, o] of result.openings.entries()) {
        const length = o.wall === 'n' || o.wall === 's' ? result.room.width : result.room.depth
        const where = `semilla ${seed}, abertura ${i}`
        expect(o.at - o.width / 2, where).toBeGreaterThanOrEqual(0.3 - MM)
        expect(o.at + o.width / 2, where).toBeLessThanOrEqual(length - 0.3 + MM)
        for (const other of result.openings.slice(i + 1)) {
          if (other.wall === o.wall) expect(Math.abs(other.at - o.at), where).toBeGreaterThanOrEqual((o.width + other.width) / 2 - MM)
        }
      }
    }
  })

  it('si no avisó de un conflicto sin resolver, nada sólido se pisa (más de 3 cm) ni queda delante de una puerta', () => {
    let clean = 0
    for (const seed of SEEDS) {
      const result = solveLayout(randomPlan(seed), resolve)
      if (result.warnings.some((w) => /superpuestos|sigue delante/.test(w))) continue
      clean++
      const solids = result.pieces.filter((p) => p.supportedBy === null && !/carpet/.test(p.asset.id))
      for (let i = 0; i < solids.length; i++) {
        for (let j = i + 1; j < solids.length; j++) {
          const a = box(solids[i] as never)
          const b = box(solids[j] as never)
          const overlapX = Math.min(a[1], b[1]) - Math.max(a[0], b[0])
          const overlapZ = Math.min(a[3], b[3]) - Math.max(a[2], b[2])
          expect(overlapX > 0.03 + 1e-6 && overlapZ > 0.03 + 1e-6, `semilla ${seed}: ${solids[i]?.asset.id} y ${solids[j]?.asset.id}`).toBe(false)
        }
      }
      for (const door of result.openings.filter((o) => o.type === 'door')) {
        const length = door.wall === 'n' || door.wall === 's' ? result.room.width : result.room.depth
        const center = door.wall === 's' ? length - door.at : door.wall === 'w' ? length - door.at : door.at
        const depth = WALL_FACE_M + 0.9
        const zone: [number, number, number, number] = {
          n: [center - door.width / 2, center + door.width / 2, 0, depth],
          s: [center - door.width / 2, center + door.width / 2, result.room.depth - depth, result.room.depth],
          e: [result.room.width - depth, result.room.width, center - door.width / 2, center + door.width / 2],
          w: [0, depth, center - door.width / 2, center + door.width / 2],
        }[door.wall] as [number, number, number, number]
        for (const piece of solids) {
          const b = box(piece)
          const hit = Math.min(b[1], zone[1]) - Math.max(b[0], zone[0]) > 1e-3 && Math.min(b[3], zone[3]) - Math.max(b[2], zone[2]) > 1e-3
          expect(hit, `semilla ${seed}: ${piece.asset.id} delante de la puerta`).toBe(false)
        }
      }
    }
    expect(clean).toBeGreaterThan(SEEDS.length / 4) // el barrido no es vacuo: una buena parte de los planos queda sin conflictos
  })

  it('todos los avisos son frases en castellano con el nombre de la pieza entre comillas angulares o hablan del ambiente', () => {
    for (const seed of SEEDS) {
      for (const warning of solveLayout(randomPlan(seed), resolve).warnings) {
        expect(warning.length, `semilla ${seed}`).toBeGreaterThan(10)
        expect(warning, `semilla ${seed}`).toMatch(/«|ambiente|puerta|ventana|muro/)
        expect(warning, `semilla ${seed}`).not.toMatch(/undefined|NaN|\[object/)
      }
    }
  })

  it('usa las piezas reales del catálogo (el barrido no se queda sin materiales)', () => {
    for (const id of IDS) expect(ASSETS.has(id), id).toBe(true)
  })
})
