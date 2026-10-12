import { describe, expect, it } from 'vitest'
import { formatMeters, formatSize } from '../src/lib/format'

describe('formatMeters y formatSize', () => {
  it('usan coma decimal, dos decimales y la unidad, como la maqueta', () => {
    expect(formatMeters(0.9)).toBe('0,90 m')
    expect(formatMeters(2.1)).toBe('2,10 m')
    expect(formatMeters(12.456)).toBe('12,46 m')
    expect(formatSize(2.06, 1.01)).toBe('2,06 × 1,01 m')
    expect(formatSize(0.34, 0.27)).toBe('0,34 × 0,27 m')
  })

  it('un valor que no es número no rompe la tarjeta', () => {
    expect(formatMeters(Number.NaN)).toBe('0,00 m')
    expect(formatSize(Number.NaN, 1)).toBe('0,00 × 1,00 m')
  })
})
