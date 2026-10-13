import { ANALYZE_IMAGE_MAX_BYTES } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/errors.js'
import { decodeImage } from '../../src/analyze-room/image.js'
import { JPEG, PNG, WEBP, b64 } from '../support/images.js'

function failure(fn: () => unknown): AppError {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    return error as AppError
  }
  throw new Error('se esperaba un error y no hubo ninguno')
}

describe('decodeImage', () => {
  it('devuelve los bytes de una foto cuyo formato coincide con los primeros bytes del archivo', () => {
    expect(decodeImage(b64(JPEG), 'image/jpeg')).toEqual(JPEG)
    expect(decodeImage(b64(PNG), 'image/png')).toEqual(PNG)
    expect(decodeImage(b64(WEBP), 'image/webp')).toEqual(WEBP)
  })

  it('rechaza un archivo cuyo contenido no es el formato que dice (422 imagen_ilegible)', () => {
    const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x1a, 0, 0, 0]), Buffer.from('WAVEfmt ')])
    const cases: [string, Buffer, 'image/jpeg' | 'image/png' | 'image/webp'][] = [
      ['PNG como JPEG', PNG, 'image/jpeg'],
      ['JPEG como PNG', JPEG, 'image/png'],
      ['WebP como JPEG', WEBP, 'image/jpeg'],
      ['JPEG como WebP', JPEG, 'image/webp'],
      ['un WAV (RIFF, pero no WEBP) como WebP', wav, 'image/webp'],
      ['texto', Buffer.from('no soy una imagen, solo texto'), 'image/png'],
      ['una firma de PNG cortada', PNG.subarray(0, 7), 'image/png'],
      ['una firma de JPEG cortada', JPEG.subarray(0, 2), 'image/jpeg'],
    ]
    for (const [label, bytes, mime] of cases) {
      const error = failure(() => decodeImage(b64(bytes), mime))
      expect(error.status, label).toBe(422)
      expect(error.code, label).toBe('imagen_ilegible')
    }
  })

  it('rechaza lo que no es base64 canónico: texto suelto, prefijo data:, saltos de línea, variante URL y relleno incorrecto', () => {
    const valid = b64(JPEG)
    const cases: [string, string][] = [
      ['texto', 'esto no es base64!'],
      ['prefijo data:', `data:image/jpeg;base64,${valid}`],
      ['salto de línea', `${valid.slice(0, 8)}\n${valid.slice(8)}`],
      ['espacios', ` ${valid} `],
      ['variante URL (- y _)', `${valid.replace(/\+/g, '-').replace(/\//g, '_')}-_`],
      ['sin relleno', valid.replace(/=+$/, '').slice(0, -1)],
      ['vacío', ''],
      ['solo relleno', '===='],
    ]
    for (const [label, image] of cases) {
      const error = failure(() => decodeImage(image, 'image/jpeg'))
      expect(error.code, label).toBe('imagen_ilegible')
    }
  })

  it('una foto de más de 3 MiB decodificados responde 413 imagen_demasiado_grande', () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(ANALYZE_IMAGE_MAX_BYTES)])
    const error = failure(() => decodeImage(b64(big), 'image/jpeg'))
    expect(error.status).toBe(413)
    expect(error.code).toBe('imagen_demasiado_grande')
  })

  it('una foto de exactamente 3 MiB todavía se acepta', () => {
    const exact = Buffer.concat([JPEG, Buffer.alloc(ANALYZE_IMAGE_MAX_BYTES - JPEG.length)])
    expect(decodeImage(b64(exact), 'image/jpeg').length).toBe(ANALYZE_IMAGE_MAX_BYTES)
  })

  it('el mensaje de error no menciona nada técnico', () => {
    const error = failure(() => decodeImage('xx', 'image/jpeg'))
    expect(error.message).not.toMatch(/base64|mime|magic|bytes/i)
  })
})
