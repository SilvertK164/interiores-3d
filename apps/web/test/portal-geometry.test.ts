import { describe, expect, it } from 'vitest'
import { portalGeometry, portalLetters } from '../src/lib/portal-geometry'

const base = {
  wordW: 300,
  wordH: 100,
  slotLeft: 120,
  slotTop: 30,
  slotW: 50,
  slotH: 40,
  fontSize: 96,
  viewportH: 900,
}

describe('portalGeometry (centro y escala del portal grande)', () => {
  it('lleva el centro de la ventana al centro de la palabra', () => {
    const g = portalGeometry(base)
    // Centro de la palabra: (150, 50). Centro de la ventana: (145, 50).
    expect(g?.dx).toBeCloseTo(5, 5)
    expect(g?.dy).toBeCloseTo(0, 5)
  })

  it('mueve hacia arriba si la ventana queda por debajo del centro de la palabra', () => {
    const g = portalGeometry({ ...base, slotTop: 50 })
    expect(g?.dy).toBeCloseTo(-20, 5)
  })

  it('la escala deja el portal en 2,6 veces el tamaño de la letra', () => {
    // 2,6 x 96 = 249,6 px de alto sobre una ventana de 40 px.
    expect(portalGeometry(base)?.scale).toBeCloseTo(6.24, 5)
  })

  it('en ventanas bajas el portal no pasa del 40 % del alto de la ventana', () => {
    // 40 % de 500 = 200 px sobre 40 px de ventana.
    expect(portalGeometry({ ...base, viewportH: 500 })?.scale).toBeCloseTo(5, 5)
  })

  it('devuelve null si todavía no hay medidas (ventana sin alto o valores no finitos)', () => {
    expect(portalGeometry({ ...base, slotH: 0 })).toBeNull()
    expect(portalGeometry({ ...base, fontSize: Number.NaN })).toBeNull()
  })
})

describe('portalLetters (de dónde sale cada letra)', () => {
  it('parte "Madori" en la primera "o": tres letras a la izquierda y dos a la derecha', () => {
    const { left, right } = portalLetters('Madori')
    expect(left.map((l) => l.ch).join('')).toBe('Mad')
    expect(right.map((l) => l.ch).join('')).toBe('ri')
  })

  it('las más lejanas del portal salen más lejos y más tarde', () => {
    const { left, right } = portalLetters('Madori')
    expect(left.map((l) => l.d)).toEqual(['1.35em', '0.9em', '0.45em'])
    expect(left.map((l) => l.delay)).toEqual(['0.16s', '0.1s', '0.04s'])
    expect(right.map((l) => l.d)).toEqual(['-0.3em', '-0.65em'])
    expect(right.map((l) => l.delay)).toEqual(['0.04s', '0.1s'])
  })

  it('una palabra sin "o" deja todas las letras a la izquierda', () => {
    const { left, right } = portalLetters('Casa')
    expect(left.map((l) => l.ch).join('')).toBe('Casa')
    expect(right).toEqual([])
  })
})
