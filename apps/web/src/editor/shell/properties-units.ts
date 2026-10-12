// Medidas del panel de propiedades: rangos, lectura de lo que se escribe (metros y grados) y ayudas para leer nodos de Pascal.
/** Rangos en metros: fuera de ellos el valor se ajusta al límite. Los mínimos de Pascal son 0,5 (puerta), 0,3 (ventana) y 0,05 (grosor). */
export const LIMITS = {
  wallLength: [0.1, 100],
  wallHeight: [0.1, 10],
  wallThickness: [0.05, 1],
  doorWidth: [0.5, 3],
  doorHeight: [1, 3.5],
  windowWidth: [0.3, 6],
  windowHeight: [0.3, 4],
  windowSill: [0, 2.5],
  itemSize: [0.05, 10],
  zoneHeight: [1.8, 10],
} as const satisfies Record<string, readonly [number, number]>

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
export const roundMm = (value: number) => Math.round(value * 1000) / 1000
const differs = (a: number, b: number) => Math.abs(a - b) > 0.0005

/** "1,25", "1.25", "1,25 m" o "125 cm" → metros. Sin unidad se entiende metros. `null` si no es un número. */
export function parseMeters(raw: string): number | null {
  const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*(m|cm)?\s*$/i.exec(raw)
  if (!match) return null
  const value = Number((match[1] ?? '').replace(',', '.'))
  if (!Number.isFinite(value)) return null
  return match[2]?.toLowerCase() === 'cm' ? value / 100 : value
}

/** "90", "90°" o "90 grados" → grados normalizados a [0, 360). `null` si no es un número. */
export function parseDegrees(raw: string): number | null {
  const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*(°|grados?)?\s*$/i.exec(raw)
  if (!match) return null
  const value = Number((match[1] ?? '').replace(',', '.'))
  return Number.isFinite(value) ? ((value % 360) + 360) % 360 : null
}

/** Un campo de metros: lee, ajusta al rango y devuelve el valor nuevo solo si es distinto del actual. */
export function metersPatch(
  raw: string,
  range: readonly [number, number],
  current: number,
): number | null {
  const parsed = parseMeters(raw)
  if (parsed === null) return null
  const next = roundMm(clamp(parsed, range[0], range[1]))
  return differs(next, current) ? next : null
}

/** Cuánto se corre una copia (en metros) para que no quede encima del original. */
export const SHIFT = 0.5

export const num = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
export const pair = (value: unknown): readonly [number, number] =>
  Array.isArray(value) ? [num(value[0], 0), num(value[1], 0)] : [0, 0]

export const vec3 = (value: unknown): readonly [number, number, number] =>
  Array.isArray(value) ? [num(value[0], 0), num(value[1], 0), num(value[2], 0)] : [0, 0, 0]

export const text = (value: unknown, fallback: string) =>
  typeof value === 'string' && value !== '' ? value : fallback
