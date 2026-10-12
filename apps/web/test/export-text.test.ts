import { describe, expect, it } from 'vitest'
import { fitText } from '../src/lib/export/fit-text'
import { formatLongDate } from '../src/lib/export/format-date'

/** Cada carácter mide 2 unidades. */
const width = (text: string) => [...text].length * 2

describe('formatLongDate (decisión de Silvert: la fecha va en letras)', () => {
  it('12 de octubre de 2026', () => {
    expect(formatLongDate(new Date(2026, 9, 12))).toBe('12 de octubre de 2026')
  })

  it('sin cero a la izquierda y con todos los meses en minúscula', () => {
    expect(formatLongDate(new Date(2027, 0, 1))).toBe('1 de enero de 2027')
    expect(formatLongDate(new Date(2026, 11, 31))).toBe('31 de diciembre de 2026')
    expect(formatLongDate(new Date(2026, 8, 5))).toBe('5 de septiembre de 2026')
  })

  it('una fecha inválida da texto vacío (no "NaN de undefined")', () => {
    expect(formatLongDate(new Date('no es una fecha'))).toBe('')
  })
})

describe('fitText (un nombre de 120 caracteres no se sale de su caja)', () => {
  it('el texto que cabe queda igual (con los espacios normalizados)', () => {
    expect(fitText('Casa Alvear', 100, width)).toBe('Casa Alvear')
    expect(fitText('  Casa   Alvear ', 100, width)).toBe('Casa Alvear')
  })

  it('el que no cabe se corta con "…" y mide lo que cabe o menos', () => {
    const long = 'abcdefghij'.repeat(13)
    expect(long.length).toBeGreaterThan(120)
    const fitted = fitText(long, 60, width)
    expect(fitted.endsWith('…')).toBe(true)
    expect(width(fitted)).toBeLessThanOrEqual(60)
    expect(width(`${fitted.slice(0, -1)}x…`)).toBeGreaterThan(60)
  })

  it('no deja un espacio antes de los puntos suspensivos', () => {
    expect(fitText('abcd efgh', 12, width)).toBe('abcd…')
  })

  it('no parte un emoji ni un par sustituto por la mitad', () => {
    const out = fitText('🏠🏠🏠🏠🏠🏠', 8, width)
    expect(out).toBe('🏠🏠🏠…')
  })

  it('si ni siquiera cabe "…" devuelve cadena vacía', () => {
    expect(fitText('Casa', 1, width)).toBe('')
  })
})
