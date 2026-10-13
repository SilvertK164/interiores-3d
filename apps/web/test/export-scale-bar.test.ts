import { describe, expect, it } from 'vitest'
import { formatMeters, pickScaleBar } from '../src/lib/export/scale-bar'

describe('escala gráfica (criterio 6 y tabla 5.3)', () => {
  it('1:25 usa 1 m, 1:50 usa 2 m y 1:100 usa 5 m', () => {
    expect(pickScaleBar(25).lengthM).toBe(1)
    expect(pickScaleBar(50).lengthM).toBe(2)
    expect(pickScaleBar(100).lengthM).toBe(5)
  })

  it('la barra de 2 m a 1:50 mide 40,0 mm', () => {
    expect(pickScaleBar(50).lengthMm).toBeCloseTo(40, 9)
    expect(pickScaleBar(25).lengthMm).toBeCloseTo(40, 9)
    expect(pickScaleBar(100).lengthMm).toBeCloseTo(50, 9)
  })

  it('mide entre 20 y 60 mm con los límites por omisión', () => {
    for (const scale of [25, 50, 100] as const) {
      const bar = pickScaleBar(scale)
      expect(bar.lengthMm).toBeGreaterThanOrEqual(20)
      expect(bar.lengthMm).toBeLessThanOrEqual(60)
      expect(bar.segments).toBe(4)
    }
  })

  it('en una zona angosta (30 mm) elige el largo más corto que sigue siendo legible', () => {
    expect(pickScaleBar(25, { maxMm: 30 }).lengthM).toBe(0.5)
    expect(pickScaleBar(50, { maxMm: 30 }).lengthM).toBe(1)
    expect(pickScaleBar(100, { maxMm: 30 }).lengthM).toBe(2)
  })

  it('si ningún largo llega a 20 mm usa el mayor que cabe; si ninguno cabe, el menor', () => {
    expect(pickScaleBar(100, { maxMm: 10 }).lengthM).toBe(1)
    expect(pickScaleBar(100, { maxMm: 3 }).lengthM).toBe(0.5)
  })

  it('las marcas están en 0, a la mitad y al final, con la unidad solo en la última', () => {
    const bar = pickScaleBar(50)
    expect(bar.ticks).toEqual([
      { atMm: 0, label: '0' },
      { atMm: 20, label: '1' },
      { atMm: 40, label: '2 m' },
    ])
    expect(pickScaleBar(25, { maxMm: 30 }).ticks.map((t) => t.label)).toEqual(['0', '0,25', '0,5 m'])
  })

  it('formatMeters usa coma decimal', () => {
    expect(formatMeters(2)).toBe('2 m')
    expect(formatMeters(0.5)).toBe('0,5 m')
    expect(formatMeters(10)).toBe('10 m')
  })
})
