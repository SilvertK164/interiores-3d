import type { DetectedFurniture, RoomAnalysis, RoomOpening } from '../../src/lib/lab/schema'

/** Planos al azar para los barridos (los mismos en cada corrida: la semilla fija todo). Sirven de piezas el catálogo local real. */
export const RANDOM_PLAN_IDS = ['sofa', 'coffee-table', 'tv-stand', 'television', 'livingroom-chair', 'bookshelf', 'indoor-plant', 'floor-lamp', 'dining-table', 'dining-chair', 'dresser', 'closet', 'rectangular-carpet', 'cactus']
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

export function randomPlan(seed: number): RoomAnalysis {
  const rnd = lcg(seed)
  const room = { width_m: rnd.between(1.5, 9), depth_m: rnd.between(1.5, 9) }
  const count = Math.floor(rnd.between(0, 13))
  const furniture: DetectedFurniture[] = Array.from({ length: count }, (_, index) => ({
    asset_id: rnd.pick(RANDOM_PLAN_IDS),
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

