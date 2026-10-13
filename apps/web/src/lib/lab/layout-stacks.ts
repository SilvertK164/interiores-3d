import { SEAT_COHERENT_DEG, WALL_FACE_M } from './layout-constants'
import { angleDiff } from './layout-geometry'
import { refreshExtent } from './layout-floor'
import type { Entry, Room } from './layout-types'

/** Cuántas piezas hay debajo de esta (el largo de su cadena de soportes). */
function depthOf(entry: Entry, bySource: ReadonlyMap<number, Entry>): number {
  let depth = 0
  for (let current = bySource.get(entry.supportSource ?? -1); current && depth <= bySource.size; current = bySource.get(current.supportSource ?? -1)) depth++
  return depth
}

/** La mitad del espacio que le sobra a una pieza de media huella `half` encima de un soporte de media huella `supportHalf`. */
const slack = (supportHalf: number, half: number) => Math.max(0, supportHalf - half)

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/**
 * Pone lo apoyado sobre otra pieza (una tele sobre su mueble, una planta sobre una mesa): a la altura real del soporte (su base más su
 * alto, así las cadenas suman), con el centro dentro de la huella del soporte (acompaña al soporte si este se movió y, si Gemini la dejó
 * más afuera de lo que cabe, se acerca) y mirando para donde mira el soporte si Gemini la dio al revés. No participa de los solapes y,
 * aunque sobresalga de un soporte más chico, nunca cruza la cara de un muro.
 */
export function placeSupported(entries: readonly Entry[], room: Room): void {
  const bySource = new Map(entries.map((entry) => [entry.source, entry]))
  const supported = entries.filter((entry) => entry.supportSource !== null).sort((a, b) => depthOf(a, bySource) - depthOf(b, bySource))
  for (const entry of supported) {
    const support = bySource.get(entry.supportSource as number)
    if (!support) continue
    if (angleDiff(entry.facing, support.facing) > SEAT_COHERENT_DEG) entry.facing = support.facing
    refreshExtent(entry)
    const wantedX = entry.gx + (support.x - support.gx)
    const wantedZ = entry.gz + (support.z - support.gz)
    const reachX = slack(support.hx, entry.hx)
    const reachZ = slack(support.hz, entry.hz)
    const x = clamp(wantedX, support.x - reachX, support.x + reachX)
    const z = clamp(wantedZ, support.z - reachZ, support.z + reachZ)
    entry.x = Math.max(WALL_FACE_M + entry.hx, Math.min(x, room.width - WALL_FACE_M - entry.hx))
    entry.z = Math.max(WALL_FACE_M + entry.hz, Math.min(z, room.depth - WALL_FACE_M - entry.hz))
    entry.y = support.y + support.height
  }
}
