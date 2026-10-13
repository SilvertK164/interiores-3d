import { describe, expect, it } from 'vitest'
import { contrastRatio, luminanceOf } from '../e2e/support/theme'

describe('luminanceOf', () => {
  it('entiende hexadecimal, rgb, rgba, color(srgb) y oklch', () => {
    expect(luminanceOf('#ffffff')).toBeCloseTo(1, 3)
    expect(luminanceOf('#000000')).toBe(0)
    expect(luminanceOf('rgb(255, 255, 255)')).toBeCloseTo(1, 3)
    expect(luminanceOf('color(srgb 1 1 1)')).toBeCloseTo(1, 3)
    expect(luminanceOf('oklch(0.998 0 0)')).toBeGreaterThan(0.98)
    expect(luminanceOf('rgb(11, 31, 77)')).toBeLessThan(0.03)
  })

  it('mezcla lo translúcido con negro (peor caso) y descarta lo transparente', () => {
    const half = luminanceOf('rgba(255, 255, 255, 0.5)') ?? 0
    expect(half).toBeGreaterThan(0.15)
    expect(half).toBeLessThan(0.3)
    expect(luminanceOf('rgba(0, 0, 0, 0)')).toBeNull()
    expect(luminanceOf('transparent')).toBeNull()
  })

  it('un panel oscuro translúcido sigue contando como oscuro', () => {
    expect(luminanceOf('rgba(10, 14, 27, 0.95)') ?? 1).toBeLessThan(0.02)
  })
})

describe('contrastRatio', () => {
  it('Noche sobre blanco pasa 7:1 y blanco sobre blanco es 1:1', () => {
    expect(contrastRatio('#0b1f4d', '#ffffff') ?? 0).toBeGreaterThan(14)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})
