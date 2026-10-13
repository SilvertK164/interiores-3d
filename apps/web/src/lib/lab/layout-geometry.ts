import { SEAT_SNAP_DEG, SNAP_DEG } from './layout-constants'

/** Geometría pura del acomodador: ángulos, la huella de una pieza girada y un rectángulo en el plano `[x0, x1, z0, z1]`. */

/** Al milímetro, y nunca `-0`. */
export const round3 = (n: number): number => Math.round(n * 1000) / 1000 + 0

/** Un ángulo en grados llevado a [0, 360). */
export const normalizeDeg = (deg: number): number => (((deg % 360) + 360) % 360) + 0

/** La diferencia entre dos ángulos, siempre entre 0 y 180. */
export function angleDiff(a: number, b: number): number {
  const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b))
  return diff > 180 ? 360 - diff : diff
}

/** El múltiplo de 90° más cercano y a cuánto está. */
export function nearestRightAngle(deg: number): { angle: number; distance: number } {
  const angle = (Math.round(normalizeDeg(deg) / 90) * 90) % 360
  return { angle: angle + 0, distance: angleDiff(deg, angle) }
}

/** Un giro a menos de `SNAP_DEG` de un ángulo recto se endereza; uno más torcido se deja (al grado). */
export function snapFacing(deg: number): number {
  const { angle, distance } = nearestRightAngle(deg)
  return distance < SNAP_DEG ? angle : normalizeDeg(Math.round(deg))
}

/** Hacia un foco: a menos de `SEAT_SNAP_DEG` de un ángulo recto se endereza; más torcido (una diagonal) se redondea a 5°. */
export function aimFacing(deg: number): number {
  const { angle, distance } = nearestRightAngle(deg)
  return distance <= SEAT_SNAP_DEG ? angle : normalizeDeg(Math.round(deg / 5) * 5)
}

/**
 * El giro de Pascal (`rotation[1]`, el de three.js: antihorario visto desde arriba) de una pieza que mira hacia `facingDeg` (horario,
 * 0 = al sur): el signo opuesto. Se lleva a (-π, π] y nunca da `-0`. Con él el frente `(sin θ, cos θ)` apunta a `facingDeg`.
 */
export function rotYFromFacing(facingDeg: number): number {
  let rad = (-normalizeDeg(facingDeg) * Math.PI) / 180
  if (rad <= -Math.PI) rad += 2 * Math.PI
  return rad + 0
}

/** Hacia dónde mira (en grados, 0 = al sur, horario) quien va de `from` a `to` en el plano; `null` si están en el mismo punto. */
export function headingTo(from: readonly [number, number], to: readonly [number, number]): number | null {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  return Math.hypot(dx, dz) < 0.05 ? null : normalizeDeg((Math.atan2(-dx, dz) * 180) / Math.PI)
}

/** Las mitades del rectángulo que ocupa una pieza de `width × depth` girada `facingDeg` (ejes x y z del plano). */
export function halfExtents(width: number, depth: number, facingDeg: number): [number, number] {
  const turns = normalizeDeg(facingDeg) / 90
  if (Number.isInteger(turns)) return turns % 2 === 0 ? [width / 2, depth / 2] : [depth / 2, width / 2]
  const rad = (facingDeg * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  return [(c * width + s * depth) / 2, (s * width + c * depth) / 2]
}

/** Un rectángulo en el plano: `[x0, x1, z0, z1]`. */
export type Rect = readonly [number, number, number, number]

/** ¿Se pisan dos rectángulos por más de `tolerance` en los dos ejes? */
export function rectsOverlap(a: Rect, b: Rect, tolerance = 0): boolean {
  return Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > tolerance && Math.min(a[3], b[3]) - Math.max(a[2], b[2]) > tolerance
}
