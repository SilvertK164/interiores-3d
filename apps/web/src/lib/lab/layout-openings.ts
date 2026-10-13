import { OPENING_AIR_M, OPENING_MARGIN_M, OPENING_MIN_M, WALL_NAMES } from './layout-constants'
import { round3 } from './layout-geometry'
import type { PlacedOpening, Room } from './layout-types'
import type { RoomOpening, WallSide } from './schema'

/** El largo de un muro: el ancho del ambiente para el norte y el sur, el fondo para el este y el oeste. */
export const wallLength = (wall: WallSide, room: Room): number => (wall === 'n' || wall === 's' ? room.width : room.depth)

const EPS = 1e-9

/** El centro libre más cercano a `wanted` dentro de `[min, max]` para una abertura de `width`, o `null` si el muro no tiene lugar. */
function nearestFree(wanted: number, min: number, max: number, width: number, others: readonly PlacedOpening[]): number | null {
  const free = (at: number) => others.every((other) => Math.abs(at - other.at) >= (width + other.width) / 2 + OPENING_AIR_M - EPS)
  const candidates = [wanted, min, max]
  for (const other of others) {
    const reach = (width + other.width) / 2 + OPENING_AIR_M
    candidates.push(other.at - reach, other.at + reach)
  }
  const valid = candidates.filter((at) => at >= min - EPS && at <= max + EPS && free(at))
  valid.sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted) || a - b)
  return valid[0] ?? null
}

/**
 * Las puertas y ventanas del plano en su muro, con su posición (al centro, desde la esquina izquierda mirando el muro desde dentro) llevada a
 * lo que cabe: a 0,3 m de cada esquina como mínimo y con el ancho limitado al muro. Dos aberturas del mismo muro nunca se pisan (la segunda
 * se corre o, si no hay lugar, se omite con aviso). No dependen de los muebles: son lo que se ve en la foto; los muebles se apartan de ellas.
 */
export function resolveOpenings(openings: readonly RoomOpening[], room: Room, warnings: string[]): PlacedOpening[] {
  const placed: PlacedOpening[] = []
  for (const opening of openings) {
    const length = wallLength(opening.wall, room)
    const kind = opening.type === 'door' ? 'puerta' : 'ventana'
    const width = round3(Math.min(opening.width_m, length - 2 * OPENING_MARGIN_M))
    if (width < OPENING_MIN_M) {
      warnings.push(`El muro ${WALL_NAMES[opening.wall]} es muy corto para la ${kind}: se omitió.`)
      continue
    }
    const min = OPENING_MARGIN_M + width / 2
    const max = length - OPENING_MARGIN_M - width / 2
    const wanted = Math.min(Math.max(opening.at_m, min), max)
    const at = nearestFree(wanted, min, max, width, placed.filter((other) => other.wall === opening.wall))
    if (at === null) {
      warnings.push(`No hubo lugar libre para la ${kind}: se omitió.`)
      continue
    }
    placed.push({ type: opening.type, wall: opening.wall, at: round3(at), width })
  }
  return placed
}
