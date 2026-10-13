import { describe, expect, it } from 'vitest'
import { DIM_MARGIN_M, fitScale, largestFittingScale, maxExtent, suggestOrientation } from '../src/lib/export/fit'
import { sheetFor } from '../src/lib/export/sheet'

const HOUSE = { widthM: 7.8, heightM: 3.8 }
const a4 = sheetFor('A4', 'landscape')
const a3 = sheetFor('A3', 'landscape')

describe('regla de cabida (spec 5.2, láminas 19 y 24)', () => {
  it('el margen de cotas es de 1 m', () => expect(DIM_MARGIN_M).toBe(1))

  it('A4 apaisada: 1:25 no cabe (352 mm de 277) y 1:50 usa 64 % del ancho', () => {
    const tight = fitScale(HOUSE, a4, 25)
    expect(tight.fits).toBe(false)
    expect(tight.neededMm.width).toBeCloseTo(352, 6)
    expect(tight.usableMm).toEqual({ width: 277, height: 154 })
    const ok = fitScale(HOUSE, a4, 50)
    expect(ok.fits).toBe(true)
    expect(ok.neededMm.width).toBeCloseTo(176, 6)
    expect(ok.percent).toBe(64)
    expect(ok.axis).toBe('width')
  })

  it('A3 apaisada: 1:25 cabe y usa 88 % del ancho (80 % del alto)', () => {
    const result = fitScale(HOUSE, a3, 25)
    expect(result.fits).toBe(true)
    expect(result.percent).toBe(88)
    expect(result.axis).toBe('width')
    expect(result.neededMm.height / result.usableMm.height).toBeCloseTo(0.797, 3)
  })

  it('el borde exacto cabe (277,00 mm de 277) y un milímetro más no', () => {
    // (12,85 + 1) m × 1000 / 50 = 277 mm
    expect(fitScale({ widthM: 12.85, heightM: 1 }, a4, 50).fits).toBe(true)
    expect(fitScale({ widthM: 12.9, heightM: 1 }, a4, 50).fits).toBe(false)
  })

  it('cuando el alto es el eje más justo, el porcentaje es el del alto', () => {
    const tall = fitScale({ widthM: 2, heightM: 14 }, a4, 100)
    expect(tall.axis).toBe('height')
    expect(tall.percent).toBe(97)
  })

  it('largestFittingScale devuelve la escala mayor (menor denominador) que cabe', () => {
    expect(largestFittingScale(HOUSE, a4)).toBe(50)
    expect(largestFittingScale(HOUSE, a3)).toBe(25)
    expect(largestFittingScale({ widthM: 0, heightM: 0 }, a4)).toBe(25)
  })

  it('un edificio que no cabe en ninguna escala devuelve null y porcentajes mayores que 100', () => {
    const huge = { widthM: 60, heightM: 40 }
    expect(largestFittingScale(huge, a4)).toBeNull()
    expect(largestFittingScale(huge, a3)).toBeNull()
    const wide = fitScale({ widthM: 60, heightM: 5 }, a4, 100)
    expect(wide.fits).toBe(false)
    expect(wide.percent).toBe(220)
    expect(wide.axis).toBe('width')
    expect(fitScale(huge, a4, 100).percent).toBeGreaterThan(100)
  })

  it('un supermercado de 40 × 30 m no cabe en A4 a ninguna escala y en A3 apaisada tampoco (31 m de alto)', () => {
    const market = { widthM: 40, heightM: 30 }
    expect(largestFittingScale(market, a4)).toBeNull()
    expect(largestFittingScale(market, a3)).toBeNull()
    expect(largestFittingScale({ widthM: 30, heightM: 20 }, a3)).toBe(100)
  })
})

describe('orientación sugerida (D7)', () => {
  it('un edificio ancho sugiere apaisada y uno alto sugiere vertical', () => {
    expect(suggestOrientation({ widthM: 20, heightM: 5 }, 'A4', true)).toBe('landscape')
    expect(suggestOrientation({ widthM: 4, heightM: 12 }, 'A4', true)).toBe('portrait')
  })

  it('si solo una orientación admite alguna escala, esa es la sugerida', () => {
    expect(suggestOrientation({ widthM: 6, heightM: 30 }, 'A3', true)).toBe('portrait')
  })

  it('a igualdad de escala gana la que sigue la forma del edificio', () => {
    // 4 × 4 m en A4: 1:50 en las dos orientaciones.
    expect(suggestOrientation({ widthM: 4, heightM: 4 }, 'A4', true)).toBe('landscape')
    expect(suggestOrientation({ widthM: 4, heightM: 12 }, 'A4', true)).toBe('portrait')
  })

  it('si no cabe en ninguna orientación se sugiere la que sigue la forma del edificio', () => {
    expect(suggestOrientation({ widthM: 90, heightM: 20 }, 'A4', true)).toBe('landscape')
    expect(suggestOrientation({ widthM: 20, heightM: 90 }, 'A4', true)).toBe('portrait')
  })
})

describe('maxExtent', () => {
  it('toma el máximo de cada eje entre las plantas', () => {
    expect(maxExtent([{ widthM: 5, heightM: 8 }, { widthM: 7, heightM: 3 }])).toEqual({ widthM: 7, heightM: 8 })
  })

  it('sin plantas es 0 × 0', () => {
    expect(maxExtent([])).toEqual({ widthM: 0, heightM: 0 })
  })
})
