import { SEAT_COHERENT_DEG } from './layout-constants'
import { aimFacing, angleDiff, headingTo } from './layout-geometry'
import type { Entry, SolverAsset } from './layout-types'

const LIVING_FOCI = ['television', 'tv-stand', 'coffee-table'] as const

/**
 * Qué mira cada asiento, por id de pieza y en orden de preferencia: un sofá o un sillón miran hacia la tele (o su mueble) o la mesa de
 * centro; una silla de comedor, hacia la mesa; una silla de escritorio, hacia el escritorio.
 */
export const SEAT_FOCI: Readonly<Record<string, readonly string[]>> = {
  sofa: LIVING_FOCI,
  'livingroom-chair': LIVING_FOCI,
  'lounge-chair': LIVING_FOCI,
  'dining-chair': ['dining-table'],
  'office-chair': ['office-table'],
}

/** Un foco y su soporte son uno solo: la tele y su mueble se tratan como el mismo punto, y se prefiere la tele. */
const FOCUS_GROUP: Readonly<Record<string, string>> = { television: 'tv', 'tv-stand': 'tv' }
const groupOf = (id: string) => FOCUS_GROUP[id] ?? id
/** Hasta qué distancia una tele y su mueble cuentan como el mismo foco. */
const SAME_FOCUS_M = 0.3

function nearestFocus<T extends SolverAsset>(seat: Entry<T>, entries: readonly Entry<T>[], kinds: readonly string[]): Entry<T> | null {
  let best: { entry: Entry<T>; distance: number; rank: number } | null = null
  for (const other of entries) {
    const rank = kinds.indexOf(other.asset.id)
    if (rank < 0 || other === seat) continue
    const distance = Math.hypot(other.x - seat.x, other.z - seat.z)
    if (best === null) {
      best = { entry: other, distance, rank }
      continue
    }
    // La tele y su mueble son un solo foco (gana la tele); entre focos distintos, el más cercano.
    const sameFocus = groupOf(best.entry.asset.id) === groupOf(other.asset.id) && Math.abs(distance - best.distance) <= SAME_FOCUS_M
    if (sameFocus ? rank < best.rank : distance < best.distance - 1e-9) best = { entry: other, distance, rank }
  }
  return best?.entry ?? null
}

/**
 * Gira cada asiento hacia su foco más cercano cuando Gemini no lo dio coherente (mira a más de 45° de él). Un asiento pegado a un muro
 * conserva su giro hacia el interior y uno apoyado sobre otra pieza no se gira. Lo que gira lo cuenta en `warnings`.
 */
export function orientSeats<T extends SolverAsset>(entries: readonly Entry<T>[], warnings: string[]): void {
  for (const seat of entries) {
    const kinds = SEAT_FOCI[seat.asset.id]
    if (!kinds || seat.wall !== null || seat.supportSource !== null) continue
    const focus = nearestFocus(seat, entries, kinds)
    const heading = focus ? headingTo([seat.x, seat.z], [focus.x, focus.z]) : null
    if (!focus || heading === null || angleDiff(seat.facing, heading) <= SEAT_COHERENT_DEG) continue
    seat.facing = aimFacing(heading)
    warnings.push(`«${seat.label}» no miraba hacia «${focus.label}»: se giró para que lo mire.`)
  }
}
