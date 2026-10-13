import { ANALYZE_BODY_MAX_BYTES, ANALYZE_IMAGE_MAX_BASE64_CHARS, ANALYZE_IMAGE_MAX_BYTES } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import type { AuthVerifier } from '../src/auth.js'
import { buildApp } from '../src/build-app.js'
import { CATALOG, JPEG, PNG, WEBP, analyzeBody, b64 } from './support/images.js'
import { createMemoryStore } from './support/memory-store.js'

const auth: AuthVerifier = async (token) => (token === 'token-a' ? { id: 'user-a', token } : null)
const headers = { authorization: 'Bearer token-a' }

const app = buildApp({ auth, store: createMemoryStore() })
const post = (payload: unknown, extra: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url: '/v1/analyze-room', headers: { ...headers, ...extra }, payload: payload as object })

/** Palabras que una persona no debería ver en un mensaje de error. */
const TECHNICAL = /base64|mime|json|api\b|gemini|token|clave|key|zod|schema|payload/i

describe('POST /v1/analyze-room: sesión', () => {
  it('sin token responde 401 con el cuerpo de error en castellano', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/analyze-room', payload: analyzeBody() })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('no_autenticado')
  })

  it('un token que no es de nadie también responde 401', async () => {
    const res = await post(analyzeBody(), { authorization: 'Bearer falso' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /v1/analyze-room: el pedido', () => {
  it('un pedido válido llega hasta el análisis; sin servicio configurado responde 503 en castellano llano', async () => {
    const res = await post(analyzeBody())
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toBe('analisis_no_disponible')
    expect(res.json().error.message).toMatch(/no está disponible/)
    expect(res.json().error.message).not.toMatch(TECHNICAL)
  })

  it('acepta las tres fotos del formato permitido y un ancho conocido', async () => {
    const photos: [string, Buffer][] = [['image/jpeg', JPEG], ['image/png', PNG], ['image/webp', WEBP]]
    for (const [mime, bytes] of photos) {
      expect((await post(analyzeBody({ image: b64(bytes), mime, knownWidthM: 4.5 }))).statusCode, mime).toBe(503)
    }
  })

  it('un catálogo inválido responde 422 catalogo_invalido', async () => {
    const bad: [string, unknown][] = [
      ['vacío', []],
      ['sin ser lista', 'sofa'],
      ['con ids repetidos', [...CATALOG, CATALOG[0]]],
      ['con una opción incompleta', [{ id: 'sofa' }]],
      ['con campos de más', [{ ...CATALOG[0], src: '/items/sofa/model.glb' }]],
      ['con un id inválido', [{ ...CATALOG[0], id: '../etc' }]],
      ['de más de 100 opciones', Array.from({ length: 101 }, (_, i) => ({ id: `p-${i}`, name: 'Pieza', category: 'x', tags: [] }))],
    ]
    for (const [label, catalog] of bad) {
      const res = await post(analyzeBody({ catalog }))
      expect(res.statusCode, label).toBe(422)
      expect(res.json().error.code, label).toBe('catalogo_invalido')
      expect(res.json().error.message, label).not.toMatch(TECHNICAL)
    }
    const missing = await post({ ...analyzeBody(), catalog: undefined })
    expect(missing.json().error.code).toBe('catalogo_invalido')
  })

  it('una foto vacía o de un formato que no es JPG, PNG ni WebP responde 422 imagen_ilegible', async () => {
    for (const bad of [analyzeBody({ image: '' }), analyzeBody({ mime: 'image/gif' }), analyzeBody({ mime: undefined }), analyzeBody({ image: 42 })]) {
      const res = await post(bad)
      expect(res.statusCode).toBe(422)
      expect(res.json().error.code).toBe('imagen_ilegible')
      expect(res.json().error.message).toMatch(/JPG, PNG o WebP/)
      expect(res.json().error.message).not.toMatch(TECHNICAL)
    }
  })

  it('un ancho conocido fuera de 0 a 100 metros responde 422 datos_invalidos y lo dice en metros', async () => {
    for (const knownWidthM of [0, -2, 100.5, '4', null]) {
      const res = await post(analyzeBody({ knownWidthM }))
      expect(res.statusCode, String(knownWidthM)).toBe(422)
      expect(res.json().error.code).toBe('datos_invalidos')
      expect(res.json().error.message).toMatch(/ancho conocido.*metros/)
      expect(res.json().error.message).not.toMatch(/knownWidthM/)
    }
  })

  it('un cuerpo que no es un objeto, o que no es JSON, responde 422 datos_invalidos', async () => {
    for (const payload of ['[]', '"hola"', '7', 'null', '{"image":']) {
      const res = await app.inject({ method: 'POST', url: '/v1/analyze-room', headers: { ...headers, 'content-type': 'application/json' }, payload })
      expect(res.statusCode, payload).toBe(422)
      expect(res.json().error.code, payload).toBe('datos_invalidos')
    }
  })
})

describe('POST /v1/analyze-room: tamaños', () => {
  it('una foto de más de 3 MB decodificados responde 413 imagen_demasiado_grande', async () => {
    const res = await post(analyzeBody({ image: 'A'.repeat(ANALYZE_IMAGE_MAX_BASE64_CHARS + 4) }))
    expect(res.statusCode).toBe(413)
    expect(res.json().error.code).toBe('imagen_demasiado_grande')
    expect(res.json().error.message).toMatch(/3 MB/)
    expect(res.json().error.message).not.toMatch(/escena/i)
  })

  it('un cuerpo que pasa el tope del pedido también responde 413 sobre la foto, no sobre «la escena»', async () => {
    const res = await post(analyzeBody({ image: 'A'.repeat(ANALYZE_BODY_MAX_BYTES + 10) }))
    expect(res.statusCode).toBe(413)
    expect(res.json().error.code).toBe('imagen_demasiado_grande')
    expect(res.json().error.message).not.toMatch(/escena/i)
  })

  it('el pedido más grande que permite el contrato (foto de 3 MB y catálogo) no se corta por el tope de 4 MiB de las escenas', async () => {
    const heavyCatalog = Array.from({ length: 100 }, (_, i) => ({ id: `pieza-${i}`, name: 'Pieza '.repeat(10).trim(), category: 'categoria', tags: ['uno', 'dos', 'tres'] }))
    const photo = b64(Buffer.concat([JPEG, Buffer.alloc(ANALYZE_IMAGE_MAX_BYTES - JPEG.length)]))
    expect(photo.length).toBe(ANALYZE_IMAGE_MAX_BASE64_CHARS)
    const payload = JSON.stringify(analyzeBody({ image: photo, catalog: heavyCatalog }))
    expect(payload.length).toBeGreaterThan(4 * 1024 * 1024)
    expect(payload.length).toBeLessThan(ANALYZE_BODY_MAX_BYTES)
    const res = await app.inject({ method: 'POST', url: '/v1/analyze-room', headers: { ...headers, 'content-type': 'application/json' }, payload })
    expect(res.statusCode).toBe(503) // llegó entera hasta el análisis, que todavía no tiene proveedor en esta prueba
  })

  it('el tope por pedido de las escenas (4 MiB) sigue valiendo para las demás rutas', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11/scene',
      headers: { ...headers, 'if-match': '1', 'content-type': 'application/json' },
      payload: JSON.stringify({ pad: 'A'.repeat(4 * 1024 * 1024 + 10) }),
    })
    expect(res.statusCode).toBe(413)
    expect(res.json().error.code).toBe('escena_demasiado_grande')
  })
})
