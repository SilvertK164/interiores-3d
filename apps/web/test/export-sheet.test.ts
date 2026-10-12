import { describe, expect, it } from 'vitest'
import { BAND_MM, BAND_PLAIN_MM, MARGIN_MM, mmToPt, paperLabel, ptToMm, sheetFor } from '../src/lib/export/sheet'
import { SCALES } from '../src/lib/export/types'

const usable = (paper: 'A4' | 'A3', orientation: 'landscape' | 'portrait', titleBlock = true) => {
  const { width, height } = sheetFor(paper, orientation, titleBlock).usable
  return [width, height]
}

describe('hojas (criterio 5)', () => {
  it('el tamaño de cada hoja en puntos coincide con A4 y A3 (tolerancia 0,5 pt)', () => {
    const cases = [
      ['A4', 'landscape', 841.89, 595.28],
      ['A4', 'portrait', 595.28, 841.89],
      ['A3', 'landscape', 1190.55, 841.89],
      ['A3', 'portrait', 841.89, 1190.55],
    ] as const
    for (const [paper, orientation, widthPt, heightPt] of cases) {
      const sheet = sheetFor(paper, orientation)
      expect(Math.abs(sheet.widthPt - widthPt), `${paper} ${orientation} ancho`).toBeLessThan(0.5)
      expect(Math.abs(sheet.heightPt - heightPt), `${paper} ${orientation} alto`).toBeLessThan(0.5)
    }
  })

  it('el área útil (hoja menos márgenes y banda de 36 mm) de las cuatro combinaciones', () => {
    expect(usable('A4', 'landscape')).toEqual([277, 154])
    expect(usable('A3', 'landscape')).toEqual([400, 241])
    expect(usable('A4', 'portrait')).toEqual([190, 241])
    expect(usable('A3', 'portrait')).toEqual([277, 364])
  })

  it('sin cajetín la banda baja a 16 mm y el área útil crece 20 mm de alto', () => {
    expect(usable('A4', 'landscape', false)).toEqual([277, 174])
    expect(sheetFor('A4', 'landscape', false).bandMm).toBe(BAND_PLAIN_MM)
    expect(sheetFor('A4', 'landscape', true).bandMm).toBe(BAND_MM)
  })

  it('el área útil empieza en el margen de 10 mm', () => {
    const { x, y } = sheetFor('A3', 'portrait').usable
    expect([x, y]).toEqual([MARGIN_MM, MARGIN_MM])
  })

  it('mm y puntos son inversos', () => {
    expect(ptToMm(mmToPt(123.4))).toBeCloseTo(123.4, 9)
    expect(mmToPt(25.4)).toBeCloseTo(72, 9)
  })

  it('el nombre de la hoja va en castellano', () => {
    expect(paperLabel('A4', 'landscape')).toBe('A4 apaisada')
    expect(paperLabel('A3', 'portrait')).toBe('A3 vertical')
  })

  it('solo hay tres escalas (decisión de Silvert)', () => {
    expect([...SCALES]).toEqual([25, 50, 100])
  })
})
