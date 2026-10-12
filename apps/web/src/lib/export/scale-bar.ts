import type { Scale } from './types'

/** Largos "bonitos" de la barra, en metros. 0,5 m solo sale cuando la zona es angosta (hoja vertical A4). */
const CANDIDATES_M = [0.5, 1, 2, 5, 10, 20] as const

export type ScaleBar = {
  lengthM: number
  lengthMm: number
  /** Tramos alternados (negro y blanco) de la barra. */
  segments: 4
  ticks: { atMm: number; label: string }[]
}

/** "2 m", "0,5 m": coma decimal y la unidad pegada con un espacio. */
export function formatMeters(meters: number): string {
  return `${formatNumber(meters)} m`
}

function formatNumber(value: number): string {
  return String(value).replace('.', ',')
}

/**
 * Elige el largo "bonito" más grande que mide entre `minMm` y `maxMm` (20 y 60 mm por omisión). Si ninguno llega al mínimo
 * usa el mayor que cabe; si ninguno cabe, el menor. 1:25 → 1 m, 1:50 → 2 m y 1:100 → 5 m en las hojas apaisadas.
 */
export function pickScaleBar(scale: Scale, limits: { minMm?: number; maxMm?: number } = {}): ScaleBar {
  const minMm = limits.minMm ?? 20
  const maxMm = limits.maxMm ?? 60
  const toMm = (meters: number) => (meters * 1000) / scale
  const fits = CANDIDATES_M.filter((m) => toMm(m) <= maxMm + 1e-9)
  const readable = fits.filter((m) => toMm(m) >= minMm - 1e-9)
  const lengthM = readable.at(-1) ?? fits.at(-1) ?? CANDIDATES_M[0]
  const lengthMm = toMm(lengthM)
  return {
    lengthM,
    lengthMm,
    segments: 4,
    ticks: [
      { atMm: 0, label: '0' },
      { atMm: lengthMm / 2, label: formatNumber(lengthM / 2) },
      { atMm: lengthMm, label: formatMeters(lengthM) },
    ],
  }
}
