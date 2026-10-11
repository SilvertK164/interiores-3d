import type { ItemDef, Pt, RoomDef, TemplateDefinition, WallDef } from './types'

const round = (n: number) => Math.round(n * 1000) / 1000

/** Cuatro muros de un rectángulo: `-n` (arriba), `-e`, `-s` (abajo) y `-w`; todos van hacia +x o +z. */
export function perimeter(prefix: string, x0: number, z0: number, x1: number, z1: number): WallDef[] {
  return [
    { id: `${prefix}-n`, from: [x0, z0], to: [x1, z0] },
    { id: `${prefix}-e`, from: [x1, z0], to: [x1, z1] },
    { id: `${prefix}-s`, from: [x0, z1], to: [x1, z1] },
    { id: `${prefix}-w`, from: [x0, z0], to: [x0, z1] },
  ]
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

export function roomArea(room: RoomDef): number {
  const [x0, z0, x1, z1] = room.rect
  return Math.abs(x1 - x0) * Math.abs(z1 - z0)
}

/** Superficie total (todos los niveles) en m², con un decimal. */
export function definitionArea(def: TemplateDefinition): number {
  const total = def.levels.reduce((sum, l) => sum + l.rooms.reduce((s, r) => s + roomArea(r), 0), 0)
  return Math.round(total * 10) / 10
}
