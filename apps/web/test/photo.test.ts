import { ANALYZE_IMAGE_MAX_BYTES } from '@interiores/contract'
import { describe, expect, it, vi } from 'vitest'
import {
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_SIDE,
  type PhotoCodec,
  PhotoError,
  bytesToBase64,
  fitWithin,
  reducePhoto,
} from '../src/lib/api/photo'

describe('fitWithin: el lado mayor no pasa de 1600 px, sin deformar ni agrandar', () => {
  it('las medidas del encargo: 1600 px y calidad JPEG 0,85', () => {
    expect(PHOTO_MAX_SIDE).toBe(1600)
    expect(PHOTO_JPEG_QUALITY).toBe(0.85)
  })

  it('una foto que ya cabe queda igual (no se agranda)', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(1600, 1200)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(1, 1)).toEqual({ width: 1, height: 1 })
  })

  it('reduce al lado mayor conservando la proporción, en horizontal y en vertical', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 })
    expect(fitWithin(8000, 8000)).toEqual({ width: 1600, height: 1600 })
  })

  it('redondea al píxel y nunca da una medida de 0', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(1601, 1000)).toEqual({ width: 1600, height: 999 })
    expect(fitWithin(100_000, 10)).toEqual({ width: 1600, height: 1 })
  })

  it('acepta otro máximo', () => {
    expect(fitWithin(4000, 2000, 1000)).toEqual({ width: 1000, height: 500 })
  })
})

describe('bytesToBase64', () => {
  it('coincide con el base64 de Node en tamaños que cruzan los trozos internos', () => {
    for (const length of [0, 1, 2, 3, 4, 100, 0x8000 - 1, 0x8000, 0x8000 + 1, 100_003]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 31 + 7) % 256)
      expect(bytesToBase64(bytes), `${length} bytes`).toBe(Buffer.from(bytes).toString('base64'))
    }
  })
})

/** Un códec de mentira: la foto «mide» lo que se le diga y el JPEG resultante es el contenido que se elija. */
function codec(size: { width: number; height: number }, jpeg: Uint8Array = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])) {
  const release = vi.fn()
  const decode = vi.fn(async () => ({ ...size, source: 'bitmap', release }))
  const encode = vi.fn(async (_photo: unknown, _target: { width: number; height: number }) => new Blob([jpeg as BlobPart], { type: 'image/jpeg' }))
  return { codec: { decode, encode } as unknown as PhotoCodec, decode, encode, release }
}
const file = (bytes = 10, type = 'image/png') => new File([new Uint8Array(bytes)], 'sala.png', { type })

describe('reducePhoto', () => {
  it('abre la foto, la reduce al tamaño que cabe y devuelve un JPEG en base64', async () => {
    const { codec: fake, decode, encode } = codec({ width: 4000, height: 3000 })
    const result = await reducePhoto(file(), fake)
    expect(result).toEqual({ image: Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64'), mime: 'image/jpeg' })
    expect(decode).toHaveBeenCalledTimes(1)
    expect(encode).toHaveBeenCalledTimes(1)
    expect(encode.mock.calls[0]?.[1]).toEqual({ width: 1600, height: 1200 })
  })

  it('una foto chica se vuelve a codificar a su tamaño (siempre sale JPEG, aunque entre PNG o WebP)', async () => {
    const { codec: fake, encode } = codec({ width: 640, height: 480 })
    const result = await reducePhoto(file(10, 'image/webp'), fake)
    expect(result.mime).toBe('image/jpeg')
    expect(encode.mock.calls[0]?.[1]).toEqual({ width: 640, height: 480 })
  })

  it('libera la foto abierta siempre, también si la codificación falla', async () => {
    const ok = codec({ width: 100, height: 100 })
    await reducePhoto(file(), ok.codec)
    expect(ok.release).toHaveBeenCalledTimes(1)

    const failing = codec({ width: 100, height: 100 })
    failing.encode.mockRejectedValueOnce(new Error('canvas'))
    await expect(reducePhoto(file(), failing.codec)).rejects.toBeInstanceOf(PhotoError)
    expect(failing.release).toHaveBeenCalledTimes(1)
  })

  it('si no se puede abrir la foto, explica en castellano que pruebe con otra imagen', async () => {
    const { codec: fake, decode } = codec({ width: 1, height: 1 })
    decode.mockRejectedValueOnce(new DOMException('no se puede decodificar', 'InvalidStateError'))
    const error = await reducePhoto(file(), fake).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PhotoError)
    expect((error as PhotoError).message).toBe('No pudimos abrir la foto. Prueba con otra imagen en formato JPG, PNG o WebP.')
  })

  it('si el navegador no puede armar el JPEG, lo dice sin lenguaje técnico', async () => {
    const { codec: fake, encode } = codec({ width: 10, height: 10 })
    encode.mockRejectedValueOnce(new Error('toBlob devolvió null'))
    const error = await reducePhoto(file(), fake).catch((e: unknown) => e)
    expect((error as PhotoError).message).toBe('No pudimos preparar la foto para enviarla. Prueba con otra imagen.')
    expect((error as PhotoError).message).not.toMatch(/toBlob|canvas/i)
  })

  it('un archivo de más de 30 MB se rechaza antes de abrirlo', async () => {
    const { codec: fake, decode } = codec({ width: 10, height: 10 })
    const huge = { size: 31 * 1024 * 1024, type: 'image/jpeg' } as unknown as Blob
    const error = await reducePhoto(huge, fake).catch((e: unknown) => e)
    expect((error as PhotoError).message).toBe('La foto pesa más de 30 MB. Prueba con una más liviana.')
    expect(decode).not.toHaveBeenCalled()
  })

  it('si el JPEG sigue pasando de 3 MB, pide otra foto en vez de mandarlo', async () => {
    const big = new Uint8Array(ANALYZE_IMAGE_MAX_BYTES + 1)
    const { codec: fake } = codec({ width: 1600, height: 1200 }, big)
    const error = await reducePhoto(file(), fake).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PhotoError)
    expect((error as PhotoError).message).toBe('La foto sigue siendo demasiado grande (más de 3 MB) aun reducida. Prueba con otra.')
  })

  it('un PhotoError ya está escrito para personas: tiene nombre y mensaje', () => {
    const error = new PhotoError('algo')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('PhotoError')
  })
})
