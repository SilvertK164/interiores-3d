import {
  DOOR_CLEAR_M,
  OVERLAP_TOLERANCE_M,
  SEPARATION_GAP_M,
  WALL_FACE_M,
  WINDOW_CLEAR_M,
  WINDOW_COVER_HEIGHT_M,
  WINDOW_COVER_WIDTH_M,
  ZONE_AIR_M,
} from './layout-constants'
import { bounds } from './layout-floor'
import { type Rect, rectsOverlap } from './layout-geometry'
import type { Entry, PlacedOpening, Room } from './layout-types'
import type { WallSide } from './schema'

/** Lo que el acomodador despeja y separa en el piso: piezas que no se pisan entre sí y no tapan puertas ni ventanas. */

type Axis = 'x' | 'z'
const EPS = 1e-9
const MAX_ROUNDS = 80
/** Paso de la búsqueda de un lugar libre cuando empujar no alcanzó. */
const SEARCH_STEP_M = 0.05
/** Una zona se considera pisada si la huella la cruza por más de esto (descarta el roce de un borde). */
const ZONE_TOLERANCE_M = 0.001

/** Una zona que tiene que quedar libre: delante de una puerta (todas las piezas) o de una ventana (las altas y anchas, que la taparían). */
export type Zone = { rect: Rect; label: string; applies: (entry: Entry) => boolean }

/** Una pieza sólida del piso: no es una alfombra ni está apoyada sobre otra. */
export const isSolid = (entry: Entry): boolean => entry.supportSource === null && !entry.rug

const half = (entry: Entry, axis: Axis) => (axis === 'x' ? entry.hx : entry.hz)
/** Una pieza pegada al muro norte o sur no puede correrse en z; contra el este o el oeste, en x: solo se desliza a lo largo del muro. */
const locked = (entry: Entry, axis: Axis) => entry.wall !== null && (axis === 'z' ? entry.wall === 'n' || entry.wall === 's' : entry.wall === 'e' || entry.wall === 'w')
const rectOf = (entry: Entry, x = entry.x, z = entry.z): Rect => [x - entry.hx, x + entry.hx, z - entry.hz, z + entry.hz]

function moveTo(entry: Entry, x: number, z: number, reason: 'overlap' | 'opening'): void {
  entry.movedBy[reason] += Math.hypot(x - entry.x, z - entry.z)
  entry.x = x
  entry.z = z
}

// --- Zonas de puertas y ventanas ---------------------------------------------------------------------------------------------------
/** Dónde está el centro de una abertura a lo largo de su muro, en las coordenadas del rectángulo (x para el norte y el sur, z para los otros). */
function alongCenter(opening: PlacedOpening, room: Room): number {
  return { n: opening.at, s: room.width - opening.at, e: opening.at, w: room.depth - opening.at }[opening.wall]
}

/**
 * Lo que debe quedar libre: delante de cada puerta, 0,9 m desde la cara del muro y tan ancho como ella (con 5 cm de aire); delante de cada
 * ventana, 0,3 m, pero solo para lo que la taparía: lo más alto que su antepecho (0,95 m) y ancho (0,9 m) a lo largo del muro.
 */
export function buildZones(openings: readonly PlacedOpening[], room: Room): Zone[] {
  return openings.map((opening) => {
    const center = alongCenter(opening, room)
    const reach = opening.width / 2 + ZONE_AIR_M
    const depth = WALL_FACE_M + (opening.type === 'door' ? DOOR_CLEAR_M : WINDOW_CLEAR_M)
    const rects: Record<WallSide, Rect> = {
      n: [center - reach, center + reach, 0, depth],
      s: [center - reach, center + reach, room.depth - depth, room.depth],
      e: [room.width - depth, room.width, center - reach, center + reach],
      w: [0, depth, center - reach, center + reach],
    }
    const rect = rects[opening.wall]
    const alongWall = (entry: Entry) => 2 * (opening.wall === 'n' || opening.wall === 's' ? entry.hx : entry.hz)
    const applies = opening.type === 'door' ? () => true : (entry: Entry) => entry.height > WINDOW_COVER_HEIGHT_M && alongWall(entry) >= WINDOW_COVER_WIDTH_M
    return { rect, label: opening.type === 'door' ? 'una puerta' : 'una ventana', applies }
  })
}

const violates = (entry: Entry, zones: readonly Zone[], x = entry.x, z = entry.z) => zones.some((zone) => zone.applies(entry) && rectsOverlap(rectOf(entry, x, z), zone.rect, ZONE_TOLERANCE_M))

/** ¿Puede estar el centro de la pieza en (x, z)? Dentro del ambiente (a 0,15 m de los bordes) y fuera de las zonas que le tocan. */
function feasible(entry: Entry, x: number, z: number, room: Room, zones: readonly Zone[]): boolean {
  const [minX, maxX] = bounds(entry.hx, room.width)
  const [minZ, maxZ] = bounds(entry.hz, room.depth)
  return x >= minX - EPS && x <= maxX + EPS && z >= minZ - EPS && z <= maxZ + EPS && !violates(entry, zones, x, z)
}

const steps = (min: number, max: number): number[] => {
  const list: number[] = []
  for (let value = min; value < max - EPS; value += SEARCH_STEP_M) list.push(value)
  list.push(max)
  return list
}

/** El lugar libre más cercano de la pieza (a paso de 5 cm), respetando que no se despega de su muro y, si se pide, que no pisa a `others`. */
function bestSpot(entry: Entry, room: Room, zones: readonly Zone[], others: readonly Entry[]): [number, number] | null {
  const [minX, maxX] = bounds(entry.hx, room.width)
  const [minZ, maxZ] = bounds(entry.hz, room.depth)
  const xs = locked(entry, 'x') ? [entry.x] : steps(minX, maxX)
  const zs = locked(entry, 'z') ? [entry.z] : steps(minZ, maxZ)
  let best: { x: number; z: number; distance: number } | null = null
  for (const x of xs) {
    for (const z of zs) {
      const distance = Math.hypot(x - entry.x, z - entry.z)
      if (best && distance >= best.distance - EPS) continue
      if (!feasible(entry, x, z, room, zones)) continue
      if (others.some((other) => other !== entry && collide(entry, other, x, z))) continue
      best = { x, z, distance }
    }
  }
  return best ? [best.x, best.z] : null
}

// --- Solapes ----------------------------------------------------------------------------------------------------------------------
const overlapX = (a: Entry, b: Entry, ax = a.x) => a.hx + b.hx - Math.abs(ax - b.x)
const overlapZ = (a: Entry, b: Entry, az = a.z) => a.hz + b.hz - Math.abs(az - b.z)
function collide(a: Entry, b: Entry, ax = a.x, az = a.z): boolean {
  return overlapX(a, b, ax) > OVERLAP_TOLERANCE_M && overlapZ(a, b, az) > OVERLAP_TOLERANCE_M
}

/** Quién se mueve cuando dos piezas se pisan: la de menor confianza; a igual confianza, la que no está pegada a un muro y después la que va más atrás en la lista. */
function mover(a: Entry, b: Entry): [Entry, Entry] {
  if (a.confidence !== b.confidence) return a.confidence < b.confidence ? [a, b] : [b, a]
  if ((a.wall === null) !== (b.wall === null)) return a.wall === null ? [a, b] : [b, a]
  return a.source > b.source ? [a, b] : [b, a]
}

/** Corre `moving` a lo largo de `axis` hasta el lado libre más cercano de `anchor`, si hay lugar (dentro del ambiente y fuera de las zonas). */
function pushApart(moving: Entry, anchor: Entry, axis: Axis, room: Room, zones: readonly Zone[]): boolean {
  if (locked(moving, axis)) return false
  const reach = half(moving, axis) + half(anchor, axis) + SEPARATION_GAP_M
  const current = moving[axis]
  const forward = moving.source > anchor.source ? 1 : -1
  const options = [anchor[axis] + reach, anchor[axis] - reach].sort((p, q) => Math.abs(p - current) - Math.abs(q - current) || forward * (q - p))
  for (const value of options) {
    const x = axis === 'x' ? value : moving.x
    const z = axis === 'z' ? value : moving.z
    if (!feasible(moving, x, z, room, zones)) continue
    moveTo(moving, x, z, 'overlap')
    return true
  }
  return false
}

/**
 * Separa las piezas sólidas que se pisan: empuja a la de menor confianza por el eje de menor solape (y, si ahí no hay lugar, a la otra, o
 * por el otro eje), sin sacarla del ambiente ni meterla en una zona de puerta o ventana ni despegarla de su muro. Las alfombras y lo
 * apoyado sobre otra pieza no cuentan. Si empujando no alcanza, busca un lugar libre cercano; lo que no tenga lugar queda y se avisa.
 */
export function separate(entries: readonly Entry[], room: Room, zones: readonly Zone[]): void {
  const solids = entries.filter(isSolid)
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let changed = false
    for (let i = 0; i < solids.length; i++) {
      for (let j = i + 1; j < solids.length; j++) {
        const [a, b] = [solids[i] as Entry, solids[j] as Entry]
        if (!collide(a, b)) continue
        const [moving, anchor] = mover(a, b)
        const axes: Axis[] = overlapX(a, b) < overlapZ(a, b) ? ['x', 'z'] : ['z', 'x']
        const pushed = axes.some((axis) => pushApart(moving, anchor, axis, room, zones) || pushApart(anchor, moving, axis, room, zones))
        if (pushed) changed = true
      }
    }
    if (!changed) break
  }
  for (const entry of [...solids].sort((p, q) => p.confidence - q.confidence || q.source - p.source)) {
    if (!solids.some((other) => other !== entry && collide(entry, other))) continue
    const spot = bestSpot(entry, room, zones, solids)
    if (spot) moveTo(entry, spot[0], spot[1], 'overlap')
  }
}

// --- Puertas y ventanas libres ---------------------------------------------------------------------------------------------------
/** Saca de las zonas de puertas y ventanas a las piezas que las tapan: el lado más cercano que quede libre (a lo largo del muro o hacia adentro). */
export function clearZones(entries: readonly Entry[], room: Room, zones: readonly Zone[]): void {
  for (const entry of entries.filter(isSolid)) {
    if (!violates(entry, zones)) continue
    const candidates: [number, number][] = []
    for (const zone of zones) {
      if (!(zone.applies(entry) && rectsOverlap(rectOf(entry), zone.rect, ZONE_TOLERANCE_M))) continue
      const [x0, x1, z0, z1] = zone.rect
      if (!locked(entry, 'x')) candidates.push([x0 - entry.hx - SEPARATION_GAP_M, entry.z], [x1 + entry.hx + SEPARATION_GAP_M, entry.z])
      if (!locked(entry, 'z')) candidates.push([entry.x, z0 - entry.hz - SEPARATION_GAP_M], [entry.x, z1 + entry.hz + SEPARATION_GAP_M])
    }
    const near = candidates
      .filter(([x, z]) => feasible(entry, x, z, room, zones))
      .sort((p, q) => Math.hypot(p[0] - entry.x, p[1] - entry.z) - Math.hypot(q[0] - entry.x, q[1] - entry.z))[0]
    const spot = near ?? bestSpot(entry, room, zones, [])
    if (spot) moveTo(entry, spot[0], spot[1], 'opening')
  }
}

/** Lo que no se pudo resolver: avisos de las piezas que siguen pisándose o delante de una puerta o ventana. */
export function conflicts(entries: readonly Entry[], zones: readonly Zone[]): string[] {
  const solids = entries.filter(isSolid)
  const found: string[] = []
  solids.forEach((a, i) => {
    for (const b of solids.slice(i + 1)) if (collide(a, b)) found.push(`«${a.label}» y «${b.label}» quedaron superpuestos: no hay lugar libre en el ambiente.`)
    for (const zone of zones) if (zone.applies(a) && rectsOverlap(rectOf(a), zone.rect, ZONE_TOLERANCE_M)) found.push(`«${a.label}» sigue delante de ${zone.label}: no hay lugar libre en el ambiente.`)
  })
  return found
}
