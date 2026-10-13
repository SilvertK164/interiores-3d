import { EDGE_M, OUTSIDE_M } from './layout-constants'
import { dropEntry } from './layout-entries'
import { halfExtents } from './layout-geometry'
import { type Entry, type Room, type SolverAsset, meters } from './layout-types'
import type { WallSide } from './schema'

const EPS = 1e-9

/** Hasta dónde puede ir el centro de una pieza de media huella `half` en un eje de largo `size`: su borde a `EDGE_M` de los bordes del ambiente. */
export const bounds = (half: number, size: number): [number, number] => [EDGE_M + half, size - EDGE_M - half]

/** Las mitades de la huella de una pieza con su giro actual. Hay que llamarla cada vez que cambia el giro. */
export function refreshExtent(entry: Entry): void {
  ;[entry.hx, entry.hz] = halfExtents(entry.width, entry.depth, entry.facing)
}

const clamp = (n: number, [min, max]: [number, number]) => Math.min(Math.max(n, min), max)

/** El eje que cruza un muro: contra el norte o el sur la pieza se corre en z; contra el este o el oeste, en x. */
const perpendicular = (wall: WallSide): 'x' | 'z' => (wall === 'n' || wall === 's' ? 'z' : 'x')

/**
 * Pone las piezas del piso dentro del ambiente. Una pieza pegada a un muro (`against_wall`) se arrima a él (su borde de atrás a 0,05 m de
 * su cara) y la que quedó con el centro a más de 0,25 m fuera del rectángulo se saca con aviso, igual que la que no cabe ni sola en el
 * ambiente. A las demás, si la huella se pasa de los muros, se las mete adentro. Lo apoyado sobre otra pieza sigue a su soporte (`layout-stacks`).
 */
export function placeOnFloor<T extends SolverAsset>(entries: Entry<T>[], room: Room, warnings: string[]): void {
  for (const entry of [...entries]) {
    if (!entries.includes(entry)) continue // se fue con su soporte
    const [minX, maxX] = bounds(entry.hx, room.width)
    const [minZ, maxZ] = bounds(entry.hz, room.depth)
    if (minX > maxX + EPS || minZ > maxZ + EPS) {
      dropEntry(entries, entry, `no cabe en el ambiente de ${meters(room.width)} × ${meters(room.depth)}.`, warnings)
      continue
    }
    if (entry.supportSource !== null) continue
    // Pegada a un muro solo importa el eje a lo largo de él: el otro se arrima al muro.
    const along = entry.wall ? (perpendicular(entry.wall) === 'x' ? 'z' : 'x') : null
    const outsideX = along !== 'z' && (entry.x < -OUTSIDE_M || entry.x > room.width + OUTSIDE_M)
    const outsideZ = along !== 'x' && (entry.z < -OUTSIDE_M || entry.z > room.depth + OUTSIDE_M)
    if (outsideX || outsideZ) {
      dropEntry(entries, entry, 'quedaba fuera del ambiente.', warnings)
      continue
    }
    if (entry.wall) {
      const target = { n: minZ, s: maxZ, w: minX, e: maxX }[entry.wall]
      const axis = perpendicular(entry.wall)
      entry.movedBy.wall += Math.abs(entry[axis] - target)
      entry[axis] = target
    }
    const x = clamp(entry.x, [minX, maxX])
    const z = clamp(entry.z, [minZ, maxZ])
    entry.movedBy.inside += Math.hypot(x - entry.x, z - entry.z)
    entry.x = x
    entry.z = z
  }
}
