import { formatArea } from '../format'
import type { GeoLike } from './plan-style'

export type Point = readonly [number, number]

const MIN_AREA_M2 = 0.05

/** Superficie por la fórmula del polígono (shoelace), siempre positiva. */
export function polygonArea(points: readonly Point[]): number {
  let twice = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (a && b) twice += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(twice) / 2
}

/** Centro de gravedad del polígono; si no tiene superficie, el promedio de sus vértices. */
export function polygonCentroid(points: readonly Point[]): [number, number] {
  let twice = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (!a || !b) continue
    const cross = a[0] * b[1] - b[0] * a[1]
    twice += cross
    cx += (a[0] + b[0]) * cross
    cy += (a[1] + b[1]) * cross
  }
  if (Math.abs(twice) < 1e-9) {
    const n = Math.max(1, points.length)
    return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n]
  }
  return [cx / (3 * twice), cy / (3 * twice)]
}

/** La etiqueta de superficie de un ambiente ("12,0 m²"), centrada y debajo del nombre. `null` si el ambiente no tiene forma. */
export function areaLabel(points: readonly Point[], options: { fontSizeM?: number; offsetM?: number } = {}): GeoLike | null {
  const area = polygonArea(points)
  if (points.length < 3 || area < MIN_AREA_M2) return null
  const fontSize = options.fontSizeM ?? 0.16
  const [cx, cy] = polygonCentroid(points)
  return {
    kind: 'text',
    x: cx,
    y: cy + (options.offsetM ?? Math.max(0.28, fontSize * 1.4)),
    text: formatArea(area),
    fontSize,
    fill: '#1f2937',
    fontWeight: 500,
    textAnchor: 'middle',
  }
}
