import { nameEs } from '../catalog-es'
import type { Pt } from '../templates/types'

/**
 * Las etiquetas de la vista previa «desde arriba»: el nombre corto de cada pieza y dónde va, sin que dos se pisen. Es pura (sin DOM): el
 * ancho de un texto se estima por su cantidad de letras, que alcanza para decidir si cabe dentro de la pieza o si va al lado.
 */

/** Una caja de etiqueta: centro `(x, z)` y tamaño, en metros del plano. */
export type Box = { x: number; z: number; width: number; height: number }
/** Una etiqueta ya ubicada. `inside`: va dentro de su pieza (texto claro sobre cobalto); si no, va al lado, con un halo claro para leerse sobre cualquier fondo. */
export type PreviewLabel = Box & { text: string; inside: boolean }

/** Los nombres cortos de las piezas del catálogo cuyo nombre en castellano es largo para una etiqueta de plano. */
const SHORT_ES: Readonly<Record<string, string>> = {
  'tv-stand': 'Mueble TV',
  television: 'Tele',
  'rectangular-carpet': 'Alfombra',
  'round-carpet': 'Alfombra',
  'coffee-table': 'Mesa centro',
  'dining-table': 'Comedor',
  'dining-chair': 'Silla',
  'lounge-chair': 'Sillón',
  'indoor-plant': 'Planta',
  'small-indoor-plant': 'Planta',
  'floor-lamp': 'Lámpara',
}
const LONG_NAME = 12

/** El nombre corto de una pieza para su etiqueta: el de la tabla de arriba; si no está, su nombre en castellano (o `fallback`, o su id) y, si es largo, solo su primera palabra. */
export function shortLabel(id: string, fallback?: string): string {
  const short = SHORT_ES[id]
  if (short) return short
  const name = nameEs(id, fallback ?? id)
  return name.length > LONG_NAME ? (name.split(' ')[0] as string) : name
}

/** Lo que mide una etiqueta de `text` con letra de `fontSize` metros (estimado: letra media de 0,58 y un aire de 0,3 a los lados). */
export const labelSize = (text: string, fontSize: number): { width: number; height: number } => ({
  width: text.length * fontSize * 0.58 + fontSize * 0.3,
  height: fontSize * 1.05,
})

const clash = (a: Box, b: Box): boolean => Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.z - b.z) < (a.height + b.height) / 2
const GAP = 0.04
/** Lo que se le perdona a una etiqueta al rozar otra pieza (por lado): un borde de 5 cm tapado no se nota y deja más sitios libres. */
const GRAZE_M = 0.05
const shrunk = (box: Box): Box => ({ ...box, width: Math.max(0, box.width - 2 * GRAZE_M), height: Math.max(0, box.height - 2 * GRAZE_M) })
/** Lo que se pide para ubicar una etiqueta: la caja de su pieza (`[x0, x1, z0, z1]`), hacia dónde mira (para no ponerla delante), el texto y lo que no debe tapar. */
export type LabelRequest = {
  text: string
  bounds: [number, number, number, number]
  front: Pt | null
  /** Cajas de otras piezas que esta etiqueta no debe tapar (las que se dibujan encima de la suya o a su lado). */
  avoid?: readonly Box[]
}
/** El ambiente `[x0, z0, x1, z1]` por dentro de sus muros: ninguna etiqueta se sale de él. */
export type Frame = [number, number, number, number]

/** Dónde puede ir la etiqueta de una pieza, en orden de preferencia: dentro (al centro, arriba, abajo, si cabe) y después al lado, primero por detrás de su frente. */
function candidates(request: LabelRequest, size: { width: number; height: number }): { x: number; z: number; inside: boolean }[] {
  const [x0, x1, z0, z1] = request.bounds
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const { width, height } = size
  const list: { x: number; z: number; inside: boolean }[] = []
  if (width <= x1 - x0 - GAP && height <= z1 - z0 - GAP) {
    list.push({ x: cx, z: cz, inside: true }, { x: cx, z: z0 + height / 2 + GAP / 2, inside: true }, { x: cx, z: z1 - height / 2 - GAP / 2, inside: true })
  }
  const sides: { dir: Pt; x: number; z: number }[] = [
    { dir: [0, -1], x: cx, z: z0 - height / 2 - GAP },
    { dir: [0, 1], x: cx, z: z1 + height / 2 + GAP },
    { dir: [1, 0], x: x1 + width / 2 + GAP, z: cz },
    { dir: [-1, 0], x: x0 - width / 2 - GAP, z: cz },
  ]
  const [fx, fz] = request.front ?? [0, 0]
  sides.sort((a, b) => a.dir[0] * fx + a.dir[1] * fz - (b.dir[0] * fx + b.dir[1] * fz)) // estable: sin frente conserva el orden
  for (const side of sides) list.push({ x: side.x, z: side.z, inside: false })
  return list
}

/**
 * Ubica las etiquetas una por una, en el orden que se dé (las primeras eligen mejor sitio): la primera posición que queda dentro del ambiente y no
 * pisa a ninguna caja de `taken` ni a una etiqueta ya ubicada. Una pieza sin lugar queda sin etiqueta (`null`): nunca se pisan dos textos.
 */
export function placeLabels(requests: readonly LabelRequest[], frame: Frame, fontSize: number, taken: readonly Box[] = []): (PreviewLabel | null)[] {
  const placed: Box[] = [...taken]
  const [fx0, fz0, fx1, fz1] = frame
  return requests.map((request) => {
    const size = labelSize(request.text, fontSize)
    for (const spot of candidates(request, size)) {
      const box: Box = { ...spot, ...size }
      const inFrame = box.x - box.width / 2 >= fx0 && box.x + box.width / 2 <= fx1 && box.z - box.height / 2 >= fz0 && box.z + box.height / 2 <= fz1
      if (!inFrame || placed.some((other) => clash(box, other)) || request.avoid?.some((other) => clash(box, shrunk(other)))) continue
      placed.push(box)
      return { ...box, text: request.text, inside: spot.inside }
    }
    return null
  })
}
