import { INTERIOR_FACING, NOTICE_M, WALL_NAMES } from './layout-constants'
import { collectEntries } from './layout-entries'
import { placeOnFloor, refreshExtent } from './layout-floor'
import { normalizeDeg, rotYFromFacing, round3, snapFacing } from './layout-geometry'
import { resolveOpenings } from './layout-openings'
import { orientSeats } from './layout-seats'
import { buildZones, clearZones, conflicts, separate } from './layout-separate'
import { placeSupported } from './layout-stacks'
import { type Entry, type LayoutPlan, type PlacedPiece, type Room, type SolverAsset, meters } from './layout-types'
import { ROOM_MAX_M, ROOM_MIN_M, type RoomAnalysis } from './schema'

/**
 * El acomodador: toma el plano que armó Gemini (`RoomAnalysis`: el ambiente, las aberturas y cada mueble en metros) y el catálogo local con
 * las medidas reales de cada pieza, y lo corrige para que tenga sentido antes de dibujarlo. Es determinista y puro (sin Pascal ni DOM).
 *
 *  1. Recorta el ambiente a 1,5–12 m por lado y saca lo que el catálogo local no tiene o el análisis no está seguro de que esté (con aviso).
 *  2. Orienta: lo pegado a un muro (`against_wall`) mira hacia el interior; el resto, si está a menos de 10° de un ángulo recto, se endereza;
 *     los asientos se giran hacia su foco (la tele o su mueble, la mesa de centro, la de comedor, el escritorio) si miran para otro lado.
 *  3. Pone cada pieza del piso dentro del ambiente (a 0,15 m de los bordes): arrima lo que va contra un muro (0,05 m de holgura sobre su
 *     cara), mete adentro lo que se pasa y saca lo que quedó fuera o no cabe.
 *  4. Despeja puertas (0,9 m libres delante) y ventanas (de lo alto y ancho) y separa lo que se solapa: se mueve la pieza de menor
 *     confianza, por el eje de menor solape, sin sacarla del ambiente. Se pisan sin problema las alfombras y lo apoyado sobre otra pieza.
 *  5. Apoya lo que tiene `on_top_of` sobre su soporte, a su altura real, y devuelve un aviso en castellano por cada corrección importante.
 */

export { EDGE_M, MIN_CONFIDENCE } from './layout-constants'
export type { LayoutPlan, PlacedOpening, PlacedPiece, Room, SolverAsset } from './layout-types'

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/** El ambiente recortado a 1,5–12 m por lado y redondeado al milímetro (el contrato ya lo exige: esto cubre un plano que no venga de la API). */
function fitRoom(room: RoomAnalysis['room'], warnings: string[]): Room {
  const width = round3(clamp(room.width_m, ROOM_MIN_M, ROOM_MAX_M))
  const depth = round3(clamp(room.depth_m, ROOM_MIN_M, ROOM_MAX_M))
  if (Math.abs(width - room.width_m) > 0.005 || Math.abs(depth - room.depth_m) > 0.005) {
    warnings.push(`El ambiente medía ${meters(room.width_m)} × ${meters(room.depth_m)}: se ajustó a ${meters(width)} × ${meters(depth)} (de ${meters(ROOM_MIN_M)} a ${meters(ROOM_MAX_M)} por lado).`)
  }
  return { width, depth }
}

/** Un aviso por cada pieza que se movió lo suficiente como para que la persona lo note (25 cm), según el motivo. */
function movedWarnings(entries: readonly Entry[]): string[] {
  const found: string[] = []
  for (const entry of entries) {
    const { wall, inside, overlap, opening } = entry.movedBy
    if (entry.wall && wall >= NOTICE_M) found.push(`«${entry.label}» estaba contra el muro ${WALL_NAMES[entry.wall]} pero quedaba a ${meters(wall)}: se pegó al muro.`)
    if (inside >= NOTICE_M) found.push(`«${entry.label}» se salía del ambiente: se movió ${meters(inside)} hacia adentro.`)
    if (overlap >= NOTICE_M) found.push(`«${entry.label}» se movió ${meters(overlap)} para no superponerse con otros muebles.`)
    if (opening >= NOTICE_M) found.push(`«${entry.label}» tapaba una puerta o una ventana: se movió ${meters(opening)}.`)
  }
  return found
}

function toPlaced<T extends SolverAsset>(entries: readonly Entry<T>[]): PlacedPiece<T>[] {
  const ordered = [...entries].sort((a, b) => a.source - b.source)
  const position = new Map(ordered.map((entry, index) => [entry.source, index]))
  return ordered.map((entry) => ({
    asset: entry.asset,
    source: entry.source,
    x: round3(entry.x),
    z: round3(entry.z),
    y: round3(entry.y),
    facingDeg: normalizeDeg(Math.round(entry.facing * 100) / 100),
    rotY: rotYFromFacing(entry.facing),
    width: entry.width,
    height: entry.height,
    depth: entry.depth,
    confidence: entry.confidence,
    againstWall: entry.wall,
    supportedBy: entry.supportSource === null ? null : (position.get(entry.supportSource) ?? null),
  }))
}

/**
 * Acomoda el plano de Gemini con las medidas reales del catálogo (`resolve` da la pieza local de un `asset_id`, con `dimensions` =
 * `[ancho, alto, fondo]`, o `undefined` si no la tiene). No modifica `analysis`. Devuelve el ambiente, las aberturas, las piezas y los avisos.
 */
export function solveLayout<T extends SolverAsset>(analysis: RoomAnalysis, resolve: (assetId: string) => T | undefined): LayoutPlan<T> {
  const warnings: string[] = []
  const room = fitRoom(analysis.room, warnings)
  const entries = collectEntries(analysis, resolve, warnings)

  for (const entry of entries) entry.facing = entry.wall ? INTERIOR_FACING[entry.wall] : snapFacing(entry.facing)
  orientSeats(entries, warnings)
  for (const entry of entries) refreshExtent(entry)
  placeOnFloor(entries, room, warnings)

  const openings = resolveOpenings(analysis.openings, room, warnings)
  const zones = buildZones(openings, room)
  clearZones(entries, room, zones)
  separate(entries, room, zones)
  placeSupported(entries, room)
  warnings.push(...movedWarnings(entries), ...conflicts(entries, zones))

  return { room, camera: analysis.camera, openings, pieces: toPlaced(entries), warnings }
}
