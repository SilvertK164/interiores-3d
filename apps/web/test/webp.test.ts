import { describe, expect, it } from 'vitest'
import { webpHasAlpha } from './support/webp'

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))
/** Un WebP mínimo: solo la cabecera RIFF y el primer trozo (lo único que lee `webpHasAlpha`). */
const webp = (chunk: string, payload: number[]) =>
  Uint8Array.from([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'), ...ascii(chunk), payload.length, 0, 0, 0, ...payload])

describe('webpHasAlpha', () => {
  it('VP8X: lee la bandera de alfa de la cabecera extendida', () => {
    expect(webpHasAlpha(webp('VP8X', [0x10, 0, 0, 0, 255, 0, 0, 255, 0, 0]))).toBe(true)
    expect(webpHasAlpha(webp('VP8X', [0x00, 0, 0, 0, 255, 0, 0, 255, 0, 0]))).toBe(false)
  })

  it('VP8L: lee el bit alpha_is_used (el bit 28 de los 32 que siguen a la firma 0x2f)', () => {
    expect(webpHasAlpha(webp('VP8L', [0x2f, 255, 63, 0, 0x10]))).toBe(true)
    expect(webpHasAlpha(webp('VP8L', [0x2f, 255, 63, 0, 0x00]))).toBe(false)
  })

  it('VP8 (con pérdida y sin trozo de alfa) nunca tiene alfa', () => {
    expect(webpHasAlpha(webp('VP8 ', [0x10, 0x10, 0x10, 0x10, 0x10, 0x10]))).toBe(false)
  })

  it('lanza si el archivo no es un WebP', () => {
    expect(() => webpHasAlpha(Uint8Array.from(ascii('GIF89a-esto-no-es-un-webp')))).toThrow('No es un WebP')
    expect(() => webpHasAlpha(webp('XXXX', [0, 0, 0, 0, 0, 0]))).toThrow('Trozo WebP desconocido')
  })
})
