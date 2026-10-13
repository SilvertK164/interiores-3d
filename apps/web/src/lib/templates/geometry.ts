import type { CabinetDef, ItemDef, LevelDef, Pt, RoomDef, ShelfDef, StairDef, TemplateDefinition, WallDef } from './types'

const round = (n: number) => Math.round(n * 1000) / 1000

/** Altura (y) de la mesada de un gabinete bajo medida desde su base: zócalo 0,10 + cuerpo 0,80 + mesada 0,02. Para apoyar piezas encima. */
export const COUNTER_Y = 0.92

/** Cuatro muros de un rectángulo: `-n` (arriba), `-e`, `-s` (abajo) y `-w`; todos van hacia +x o +z. */
export function perimeter(prefix: string, x0: number, z0: number, x1: number, z1: number): WallDef[] {
  return [
    { id: `${prefix}-n`, from: [x0, z0], to: [x1, z0] },
    { id: `${prefix}-e`, from: [x1, z0], to: [x1, z1] },
    { id: `${prefix}-s`, from: [x0, z1], to: [x1, z1] },
    { id: `${prefix}-w`, from: [x0, z0], to: [x0, z1] },
  ]
}

/**
 * El punto de la definición (coordenadas positivas desde la esquina) que `buildScene` lleva al origen de la escena: el centro de la caja
 * que envuelve los muros de la planta. Para pasar un punto de la definición al mundo de Pascal hay que restárselo (en x y en z).
 */
export function sceneCenter(level: Pick<LevelDef, 'walls'>): Pt {
  const points = level.walls.flatMap((wall) => [wall.from, wall.to])
  const xs = points.map((p) => p[0])
  const zs = points.map((p) => p[1])
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2]
}

type Opts = { rotY?: number; y?: number }

/** `count` piezas repartidas en línea recta de `from` a `to`, ambos extremos incluidos. */
export function row(asset: string, from: Pt, to: Pt, count: number, opts: Opts = {}): ItemDef[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1)
    return { asset, at: [round(from[0] + (to[0] - from[0]) * t), round(from[1] + (to[1] - from[1]) * t)] as Pt, ...opts }
  })
}

/** Cuadrícula de `columns` × `rows` piezas con paso `step` desde `origin`. */
export function grid(asset: string, origin: Pt, columns: number, rows: number, step: Pt, opts: Opts = {}): ItemDef[] {
  const out: ItemDef[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      out.push({ asset, at: [round(origin[0] + c * step[0]), round(origin[1] + r * step[1])], ...opts })
    }
  }
  return out
}

/** `count` estantes iguales repartidos en línea recta de `from` a `to` (ids `<prefijo>-1`, `<prefijo>-2`…). */
export function shelfRow(
  prefix: string,
  base: Omit<ShelfDef, 'id' | 'at'>,
  from: Pt,
  to: Pt,
  count: number,
  extra: { rotY?: number; y?: number } = {},
): ShelfDef[] {
  return row('', from, to, count).map((p, i) => ({ ...base, ...extra, id: `${prefix}-${i + 1}`, at: p.at }))
}

/** Ancho total de una corrida de gabinetes: la suma de sus módulos. */
export function cabinetWidth(cabinet: Pick<CabinetDef, 'modules'>): number {
  return Math.round(cabinet.modules.reduce((sum, m) => sum + m.width, 0) * 1000) / 1000
}

/**
 * Esquinas (x, z) de la base `width × depth` centrada en `at` y girada `rotY`. Sigue la convención de three.js:
 * el eje local x va a (cos, -sin) y el eje local z (el frente) a (sin, cos).
 */
export function footprint(at: Pt, width: number, depth: number, rotY = 0): Pt[] {
  const c = Math.cos(rotY)
  const s = Math.sin(rotY)
  const corner = (kx: number, kz: number): Pt => [
    round(at[0] + (c * kx * width) / 2 + (s * kz * depth) / 2),
    round(at[1] + (-s * kx * width) / 2 + (c * kz * depth) / 2),
  ]
  return [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
}

export const DEFAULT_STAIR_RUN = 3

/** Medidas por defecto de las aberturas (las usan el constructor y el validador). */
export const DOOR_HEIGHT = 2.1
export const WINDOW_HEIGHT = 1.2
export const WINDOW_SILL = 0.9
export const DEFAULT_LEVEL_HEIGHT = 2.5

/** Punto donde la escalera llega al piso de arriba (el pie más `run` metros hacia donde mira `rotY`). */
export function stairEnd(stair: Pick<StairDef, 'at' | 'rotY' | 'run'>): Pt {
  const run = stair.run ?? DEFAULT_STAIR_RUN
  return [round(stair.at[0] + Math.sin(stair.rotY) * run), round(stair.at[1] + Math.cos(stair.rotY) * run)]
}

/** Base de la escalera en planta: un rectángulo `width × run` entre el pie y la llegada. */
export function stairFootprint(stair: Pick<StairDef, 'at' | 'rotY' | 'run' | 'width'>): Pt[] {
  const run = stair.run ?? DEFAULT_STAIR_RUN
  const center: Pt = [stair.at[0] + (Math.sin(stair.rotY) * run) / 2, stair.at[1] + (Math.cos(stair.rotY) * run) / 2]
  return footprint(center, stair.width, run, stair.rotY)
}

export function roomArea(room: RoomDef): number {
  const [x0, z0, x1, z1] = room.rect
  return Math.abs(x1 - x0) * Math.abs(z1 - z0)
}

/** Superficie total (todos los niveles) en m², con un decimal. */
export function definitionArea(def: TemplateDefinition): number {
  const total = def.levels.reduce((sum, l) => sum + l.rooms.reduce((s, r) => s + roomArea(r), 0), 0)
  return Math.round(total * 10) / 10
}
