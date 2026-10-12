import { describe, expect, it } from 'vitest'
import { faceFor, splitRuns } from '../src/lib/export/font-coverage'

describe('reparto de caracteres entre DM Sans latina y latina extendida', () => {
  it('el castellano completo es latino', () => {
    expect(splitRuns('Ñandú — año 1:50 · 12 de octubre ¿sí? ¡ya!')).toEqual([{ face: 'latin', text: 'Ñandú — año 1:50 · 12 de octubre ¿sí? ¡ya!' }])
  })

  it('"Łódź" y "ő" van a la extendida y lo demás a la latina', () => {
    expect(splitRuns('Łódź')).toEqual([
      { face: 'ext', text: 'Ł' },
      { face: 'latin', text: 'ód' },
      { face: 'ext', text: 'ź' },
    ])
    expect(splitRuns('Győr')).toEqual([
      { face: 'latin', text: 'Gy' },
      { face: 'ext', text: 'ő' },
      { face: 'latin', text: 'r' },
    ])
  })

  it('un carácter que ninguna fuente tiene sale como "?" (emoji, escritura no latina, controles)', () => {
    expect(splitRuns('Casa 🏠')).toEqual([{ face: 'latin', text: 'Casa ?' }])
    expect(splitRuns('日本')).toEqual([{ face: 'latin', text: '??' }])
    expect(splitRuns('a\u0000b\tc')).toEqual([{ face: 'latin', text: 'a?b?c' }])
  })

  it('con solo la fuente latina (respaldo Helvetica) lo extendido sale como "?"', () => {
    expect(splitRuns('Łódź', ['latin'])).toEqual([{ face: 'latin', text: '?ód?' }])
  })

  it('un texto vacío no tiene tramos', () => {
    expect(splitRuns('')).toEqual([])
  })

  it('faceFor en los bordes', () => {
    expect(faceFor(0x20)).toBe('latin')
    expect(faceFor(0x7f)).toBeNull()
    expect(faceFor(0xe1)).toBe('latin')
    expect(faceFor(0x2014)).toBe('latin')
    expect(faceFor(0x141)).toBe('ext')
    expect(faceFor(0x1e9e)).toBe('ext')
    expect(faceFor(0x4e00)).toBeNull()
    expect(faceFor(0x1f3e0)).toBeNull()
  })
})
