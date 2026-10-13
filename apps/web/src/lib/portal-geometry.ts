import { splitAtO } from './brand'

/** Alto del portal grande, en veces el tamaño de la letra, y tope respecto al alto de la ventana del navegador. */
const PORTAL_SIZE_EM = 2.6
const PORTAL_MAX_VIEWPORT_SHARE = 0.4

/** Medidas en px de la palabra y de la ventana de la "o" (`offset*`: no cambian con las transformaciones). */
export type PortalMeasures = {
  wordW: number
  wordH: number
  slotLeft: number
  slotTop: number
  slotW: number
  slotH: number
  fontSize: number
  viewportH: number
}

/**
 * Cuánto hay que mover (`dx`, `dy`, en px) y agrandar (`scale`) la ventana de la "o" para que quede grande y en el
 * centro de la palabra, que a su vez está centrada en la pantalla. `null` si aún no hay medidas válidas.
 */
export function portalGeometry(
  m: PortalMeasures,
): { dx: number; dy: number; scale: number } | null {
  const values = Object.values(m)
  if (!values.every(Number.isFinite) || m.slotH <= 0) return null
  const target = Math.min(m.fontSize * PORTAL_SIZE_EM, m.viewportH * PORTAL_MAX_VIEWPORT_SHARE)
  return {
    dx: m.wordW / 2 - (m.slotLeft + m.slotW / 2),
    dy: m.wordH / 2 - (m.slotTop + m.slotH / 2),
    scale: target / m.slotH,
  }
}

export type PortalLetter = {
  ch: string
  /** Distancia en em desde la que sale la letra (positiva: viene desde la derecha, hacia la ventana). */
  d: string
  /** Retraso en segundos; las más cercanas a la ventana salen primero. */
  delay: string
}

const STEP_LEFT_EM = 0.45
const FIRST_RIGHT_EM = 0.3
const STEP_RIGHT_EM = 0.35
const BASE_DELAY_S = 0.04
const STEP_DELAY_S = 0.06

const fmt = (n: number) => `${+n.toFixed(2)}`

/** Las letras a cada lado de la "o" con su distancia y su retraso propios (la escalera de la animación). */
export function portalLetters(name: string): { left: PortalLetter[]; right: PortalLetter[] } {
  const [before, after] = splitAtO(name) ?? [name, '']
  const left = [...before].map((ch, i) => ({
    ch,
    d: `${fmt((before.length - i) * STEP_LEFT_EM)}em`,
    delay: `${fmt(BASE_DELAY_S + (before.length - 1 - i) * STEP_DELAY_S)}s`,
  }))
  const right = [...after].map((ch, j) => ({
    ch,
    d: `${fmt(-(FIRST_RIGHT_EM + j * STEP_RIGHT_EM))}em`,
    delay: `${fmt(BASE_DELAY_S + j * STEP_DELAY_S)}s`,
  }))
  return { left, right }
}
