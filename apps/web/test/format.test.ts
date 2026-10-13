import { describe, expect, it } from 'vitest'
import { formatFileSize, formatMeters, formatSize } from '../src/lib/format'

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

describe('formatFileSize', () => {
  it('bytes, KB y MB con coma decimal y la unidad', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1023)).toBe('1023 B')
    expect(formatFileSize(1024)).toBe('1,0 KB')
    expect(formatFileSize(1536)).toBe('1,5 KB')
    expect(formatFileSize(250 * 1024)).toBe('250,0 KB')
    expect(formatFileSize(1024 * 1024)).toBe('1,0 MB')
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe('2,4 MB')
    expect(formatFileSize(30 * 1024 * 1024)).toBe('30,0 MB')
  })

  it('un valor que no es un tamaño no rompe la vista previa', () => {
    expect(formatFileSize(Number.NaN)).toBe('0 B')
    expect(formatFileSize(-5)).toBe('0 B')
  })
})
