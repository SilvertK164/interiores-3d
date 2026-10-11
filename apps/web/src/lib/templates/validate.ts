import { DEFAULT_LEVEL_HEIGHT, DOOR_HEIGHT, WINDOW_HEIGHT, WINDOW_SILL, cabinetWidth, footprint, stairEnd, stairFootprint } from './geometry'
import type { LevelDef, OpeningDef, RoomDef, TemplateDefinition, WallDef } from './types'

const EPS = 0.011
const MARGIN = 0.1 // una abertura no puede quedar a menos de 10 cm de la esquina

const length = (w: WallDef) => Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1])
const isHorizontal = (w: WallDef) => Math.abs(w.from[1] - w.to[1]) < EPS
const isVertical = (w: WallDef) => Math.abs(w.from[0] - w.to[0]) < EPS

/** ¿Los muros colineales cubren de punta a punta el borde `a..b` situado en `fixed`? */
function edgeCovered(axis: 'h' | 'v', fixed: number, a: number, b: number, walls: readonly WallDef[]): boolean {
  const spans: [number, number][] = []
  for (const w of walls) {
    if (axis === 'h' && isHorizontal(w) && Math.abs(w.from[1] - fixed) < EPS) {
      spans.push([Math.min(w.from[0], w.to[0]), Math.max(w.from[0], w.to[0])])
    }
    if (axis === 'v' && isVertical(w) && Math.abs(w.from[0] - fixed) < EPS) {
      spans.push([Math.min(w.from[1], w.to[1]), Math.max(w.from[1], w.to[1])])
    }
  }
  spans.sort((p, q) => p[0] - q[0])
  let reach = a
  for (const [s, e] of spans) {
    if (s > reach + EPS) break
    reach = Math.max(reach, e)
  }
  return reach >= b - EPS
}

const duplicates = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i)
const inside = (room: RoomDef, x: number, z: number, tol = 0.05) =>
  x >= room.rect[0] - tol && x <= room.rect[2] + tol && z >= room.rect[1] - tol && z <= room.rect[3] + tol

function checkRoom(room: RoomDef, walls: readonly WallDef[], errors: string[]) {
  const [x0, z0, x1, z1] = room.rect
  if (x1 <= x0 || z1 <= z0) {
    errors.push(`El ambiente ${room.name.toLowerCase()} tiene un rectángulo inválido.`)
    return
  }
  const edges: ['n' | 's' | 'w' | 'e', 'h' | 'v', number, number, number][] = [
    ['n', 'h', z0, x0, x1],
    ['s', 'h', z1, x0, x1],
    ['w', 'v', x0, z0, z1],
    ['e', 'v', x1, z0, z1],
  ]
  const open = room.open ?? []
  if (edges.some(([side, axis, fixed, a, b]) => !open.includes(side) && !edgeCovered(axis, fixed, a, b, walls))) {
    errors.push(`El ambiente ${room.name.toLowerCase()} no cierra: algún borde no está cubierto por muros de punta a punta.`)
  }
}

function checkOpenings(openings: readonly OpeningDef[], walls: readonly WallDef[], levelHeight: number, errors: string[]) {
  const byWall = new Map<string, OpeningDef[]>()
  for (const o of openings) {
    const wall = walls.find((w) => w.id === o.wall)
    if (!wall) {
      errors.push(`La abertura ${o.id} apunta al muro ${o.wall}, que no existe.`)
      continue
    }
    if (o.at - o.width / 2 < MARGIN - EPS || o.at + o.width / 2 > length(wall) - MARGIN + EPS) {
      errors.push(`La abertura ${o.id} se sale del muro ${o.wall} (largo ${length(wall).toFixed(2)} m) o queda pegada a la esquina.`)
    }
    const top = (o.type === 'window' ? (o.sill ?? WINDOW_SILL) : 0) + (o.height ?? (o.type === 'door' ? DOOR_HEIGHT : WINDOW_HEIGHT))
    if (top > (wall.height ?? levelHeight) + 0.001) {
      errors.push(`La abertura ${o.id} es más alta que el muro ${o.wall} (llega a ${top.toFixed(2)} m y el muro mide ${(wall.height ?? levelHeight).toFixed(2)} m).`)
    }
    byWall.set(o.wall, [...(byWall.get(o.wall) ?? []), o])
  }
  for (const [wall, list] of byWall) {
    const sorted = [...list].sort((p, q) => p.at - q.at)
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1] as OpeningDef
      const next = sorted[i] as OpeningDef
      if (prev.at + prev.width / 2 > next.at - next.width / 2 + EPS) {
        errors.push(`Las aberturas ${prev.id} y ${next.id} se pisan en el muro ${wall}.`)
      }
    }
  }
}

function checkLevel(level: LevelDef, levels: readonly LevelDef[], levelIds: string[], index: number, assetIds: ReadonlySet<string>, materialIds: ReadonlySet<string>, errors: string[]) {
  for (const id of new Set([...duplicates(level.walls.map((w) => w.id)), ...duplicates(level.rooms.map((r) => r.id)), ...duplicates(level.openings.map((o) => o.id)), ...duplicates((level.stairs ?? []).map((s) => s.id)), ...duplicates((level.shelves ?? []).map((s) => s.id)), ...duplicates((level.cabinets ?? []).map((c) => c.id))])) {
    errors.push(`El id ${id} está repetido en el nivel ${level.id}.`)
  }
  for (const w of level.walls) {
    if (!isHorizontal(w) && !isVertical(w)) errors.push(`El muro ${w.id} no es horizontal ni vertical.`)
    if (length(w) < 0.3) errors.push(`El muro ${w.id} es demasiado corto.`)
  }
  for (const room of level.rooms) checkRoom(room, level.walls, errors)
  for (let i = 0; i < level.rooms.length; i++) {
    for (let j = i + 1; j < level.rooms.length; j++) {
      const a = level.rooms[i] as RoomDef
      const b = level.rooms[j] as RoomDef
      const overlapX = Math.min(a.rect[2], b.rect[2]) - Math.max(a.rect[0], b.rect[0])
      const overlapZ = Math.min(a.rect[3], b.rect[3]) - Math.max(a.rect[1], b.rect[1])
      if (overlapX > EPS && overlapZ > EPS) errors.push(`Los ambientes ${a.id} y ${b.id} se solapan.`)
    }
  }
  checkOpenings(level.openings, level.walls, level.height ?? DEFAULT_LEVEL_HEIGHT, errors)
  for (const item of level.items) {
    if (!assetIds.has(item.asset)) errors.push(`La pieza ${item.asset} no está en el catálogo.`)
    if (!level.rooms.some((r) => inside(r, item.at[0], item.at[1]))) {
      errors.push(`La pieza ${item.asset} en (${item.at[0]}, ${item.at[1]}) cae fuera de los ambientes del nivel ${level.id}.`)
    }
  }
  const inRooms = (corners: [number, number][]) => corners.every(([x, z]) => level.rooms.some((r) => inside(r, x, z)))
  const between = (n: number | undefined, min: number, max: number) => n === undefined || (Number.isInteger(n) && n >= min && n <= max)
  for (const sh of level.shelves ?? []) {
    const ok = sh.width >= 0.3 && sh.width <= 3 && sh.depth >= 0.1 && sh.depth <= 1 && sh.height >= 0.05 && sh.height <= 2.5 && between(sh.rows, 1, 8) && between(sh.columns, 1, 6)
    if (!ok) errors.push(`El estante ${sh.id} tiene medidas que Pascal no admite (ancho 0,3 a 3 m, fondo 0,1 a 1 m, alto 0,05 a 2,5 m, 1 a 8 filas, 1 a 6 columnas).`)
    if (!inRooms(footprint(sh.at, sh.width, sh.depth, sh.rotY))) errors.push(`El estante ${sh.id} cae fuera de los ambientes del nivel ${level.id}.`)
  }
  for (const c of level.cabinets ?? []) {
    const width = cabinetWidth(c)
    if (c.modules.length === 0) {
      errors.push(`El gabinete ${c.id} no tiene ningún módulo.`)
      continue
    }
    if (width > 3) errors.push(`El gabinete ${c.id} mide ${width} m: Pascal admite hasta 3 m por corrida; divídelo en dos.`)
    const bad = c.modules.some((m) => m.width < 0.05 || m.width > 3 || m.stack.length === 0) || c.depth < 0.3 || c.depth > 1.2 || c.height < 0.4 || c.height > 2.4
    if (bad) errors.push(`El gabinete ${c.id} tiene medidas o módulos que Pascal no admite (fondo 0,3 a 1,2 m, alto 0,4 a 2,4 m, cada módulo con al menos un compartimento).`)
    if (!inRooms(footprint(c.at, width, c.depth, c.rotY))) errors.push(`El gabinete ${c.id} cae fuera de los ambientes del nivel ${level.id}.`)
  }
  for (const s of level.stairs ?? []) {
    const target = levelIds.indexOf(s.to)
    if (s.steps < 4 || s.width < 0.7) errors.push(`La escalera ${s.id} tiene muy pocos escalones o es muy angosta.`)
    if (target <= index) {
      errors.push(`La escalera ${s.id} debe subir a un nivel posterior que exista (${s.to}).`)
    } else if (!level.rooms.some((r) => inside(r, s.at[0], s.at[1], 0))) {
      errors.push(`La escalera ${s.id} arranca fuera de los ambientes del nivel ${level.id}.`)
    } else if (!inRooms(stairFootprint(s))) {
      errors.push(`La escalera ${s.id} queda en parte fuera de los ambientes del nivel ${level.id}: revisa hacia dónde sube (rotY) y su recorrido.`)
    } else {
      const [x, z] = stairEnd(s)
      if (!(levels[target] as LevelDef).rooms.some((r) => inside(r, x, z, 0.25))) {
        errors.push(`La escalera ${s.id} no llega al nivel ${s.to}: termina en (${x}, ${z}), fuera de sus ambientes.`)
      }
    }
  }
  const materials: (string | undefined | null)[] = [
    level.wallInside,
    level.wallOutside,
    ...level.walls.flatMap((w) => [w.inside, w.outside]),
    ...level.rooms.flatMap((r) => [r.floor, r.ceiling]),
    ...(level.shelves ?? []).map((sh) => sh.material),
    ...(level.cabinets ?? []).map((c) => c.material),
  ]
  for (const m of new Set(materials)) {
    if (m && !materialIds.has(m)) errors.push(`El material ${m} no existe en la biblioteca de Pascal.`)
  }
}

/** Devuelve la lista de problemas de una definición (vacía si es válida). */
export function validateDefinition(def: TemplateDefinition, assetIds: ReadonlySet<string>, materialIds: ReadonlySet<string>): string[] {
  const errors: string[] = []
  const levelIds = def.levels.map((l) => l.id)
  for (const id of new Set(duplicates(levelIds))) errors.push(`El id de nivel ${id} está repetido.`)
  if (def.levels.length === 0 || def.levels.every((l) => l.rooms.length === 0)) errors.push('La plantilla no tiene ambientes.')
  for (const [index, level] of def.levels.entries()) checkLevel(level, def.levels, levelIds, index, assetIds, materialIds, errors)
  return errors
}
