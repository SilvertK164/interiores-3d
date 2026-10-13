import { Writable } from 'node:stream'
import { RoomAnalysisSchema } from '@interiores/contract'
import { describe, expect, it, vi } from 'vitest'
import { ProviderError, type VisionProvider } from '../src/analyze-room/types.js'
import type { AuthVerifier } from '../src/auth.js'
import { LOGGER_REDACT, buildApp } from '../src/build-app.js'
import { CATALOG, JPEG, PNG, analyzeBody, b64 } from './support/images.js'
import { createMemoryStore } from './support/memory-store.js'
import { unlimitedUsage } from './support/memory-usage.js'

const auth: AuthVerifier = async (token) => (token === 'token-a' ? { id: 'user-a', token } : null)
const headers = { authorization: 'Bearer token-a' }
const TECHNICAL = /base64|mime|json|api\b|gemini|token|clave|key|zod|schema|payload/i

const RESULT = {
  furniture: [{ asset_id: 'sofa', x: 0.5, y: 0.6, width: 0.3, depth: 0.12, rotation_deg: 0, confidence: 0.8 }],
  warnings: ['oclusión parcial'],
}

type App = ReturnType<typeof buildApp>
const appWith = (provider: VisionProvider | null, options: Parameters<typeof buildApp>[1] = {}) =>
  buildApp({ auth, store: createMemoryStore(), analysis: { provider, usage: unlimitedUsage } }, options)
const send = (app: App, payload: unknown) => app.inject({ method: 'POST', url: '/v1/analyze-room', headers, payload: payload as object })

describe('POST /v1/analyze-room: con el proveedor de visión', () => {
  it('devuelve los muebles, los avisos y la calibración, y le pasa al proveedor lo que recibió', async () => {
    const provider = vi.fn<VisionProvider>(async () => RESULT)
    const res = await send(appWith(provider), analyzeBody({ knownWidthM: 4.5 }))
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ...RESULT, calibration: { status: 'user_provided', width_m: 4.5 } })
    expect(RoomAnalysisSchema.safeParse(res.json()).success).toBe(true)
    expect(provider).toHaveBeenCalledTimes(1)
    expect(provider).toHaveBeenCalledWith({ image: b64(JPEG), mime: 'image/jpeg', catalog: CATALOG })
  })

  it('sin ancho conocido responde sin calibrar', async () => {
    const res = await send(appWith(async () => RESULT), analyzeBody())
    expect(res.json().calibration).toEqual({ status: 'uncalibrated', width_m: null })
  })

  it('una foto cuyo contenido no es el formato indicado responde 422 y no llega al proveedor', async () => {
    const provider = vi.fn<VisionProvider>(async () => RESULT)
    const bad = [
      analyzeBody({ image: b64(PNG), mime: 'image/jpeg' }),
      analyzeBody({ image: b64(JPEG), mime: 'image/png' }),
      analyzeBody({ image: 'AAAA', mime: 'image/webp' }),
      analyzeBody({ image: 'no es base64!' }),
    ]
    for (const payload of bad) {
      const res = await send(appWith(provider), payload)
      expect(res.statusCode).toBe(422)
      expect(res.json().error.code).toBe('imagen_ilegible')
    }
    expect(provider).not.toHaveBeenCalled()
  })

  it('sin clave configurada (proveedor nulo) responde 503 aunque el pedido sea válido', async () => {
    const res = await send(appWith(null), analyzeBody())
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toBe('analisis_no_disponible')
  })

  it('si el proveedor falla responde 502 en castellano llano, sin detalles del proveedor', async () => {
    const failing: VisionProvider = async () => {
      throw new ProviderError('http_500:INTERNAL')
    }
    const res = await send(appWith(failing), analyzeBody())
    expect(res.statusCode).toBe(502)
    expect(res.json().error.code).toBe('analisis_fallido')
    expect(res.json().error.message).toBe('No pudimos analizar la foto en este momento. Inténtalo de nuevo en unos minutos.')
    expect(res.json().error.message).not.toMatch(TECHNICAL)
  })

  it('si el proveedor inventa un id que no estaba en el catálogo responde 502 y no lo deja pasar', async () => {
    const invented: VisionProvider = async () => ({ ...RESULT, furniture: [{ ...RESULT.furniture[0], asset_id: 'inventado' }] })
    const res = await send(appWith(invented), analyzeBody())
    expect(res.statusCode).toBe(502)
    expect(JSON.stringify(res.json())).not.toContain('inventado')
  })

  it('la autenticación va primero: sin token ni siquiera se mira el pedido', async () => {
    const provider = vi.fn<VisionProvider>(async () => RESULT)
    const res = await appWith(provider).inject({ method: 'POST', url: '/v1/analyze-room', payload: analyzeBody() as object })
    expect(res.statusCode).toBe(401)
    expect(provider).not.toHaveBeenCalled()
  })
})

describe('POST /v1/analyze-room: registros (logs)', () => {
  function capture() {
    const lines: string[] = []
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString())
        cb()
      },
    })
    return { lines, logger: { level: 'trace', stream, redact: LOGGER_REDACT } }
  }

  it('ni la foto, ni el catálogo, ni el prompt aparecen en los logs, y el motivo del fallo sí', async () => {
    const { lines, logger } = capture()
    const image = b64(Buffer.concat([JPEG, Buffer.from('contenido-secreto-de-la-foto')]))
    const failing: VisionProvider = async () => {
      throw new ProviderError('http_400:INVALID_ARGUMENT')
    }
    const res = await send(appWith(failing, { logger }), analyzeBody({ image }))
    expect(res.statusCode).toBe(502)
    const logged = lines.join('')
    expect(logged).toContain('http_400:INVALID_ARGUMENT')
    expect(logged).not.toContain(image)
    expect(logged).not.toContain('Mesa de centro')
    expect(logged).not.toContain('token-a')
  })

  it('aunque un proveedor ponga la foto en el motivo de su error, el registro solo guarda palabras de un vocabulario corto', async () => {
    const { lines, logger } = capture()
    const image = b64(Buffer.concat([JPEG, Buffer.from('foto-que-viaja-en-el-motivo')]))
    const careless: VisionProvider = async (request) => {
      throw new ProviderError(`http_400 ${request.image}`)
    }
    const res = await send(appWith(careless, { logger }), analyzeBody({ image }))
    expect(res.statusCode).toBe(502)
    expect(lines.join('')).not.toContain(image)
    expect(lines.join('')).toContain('unexpected')
  })

  it('un error inesperado dentro del proveedor tampoco filtra la foto', async () => {
    const { lines, logger } = capture()
    const image = b64(Buffer.concat([JPEG, Buffer.from('otro-contenido-secreto')]))
    const exploding: VisionProvider = async () => {
      throw new Error(`se rompió con ${image}`)
    }
    const res = await send(appWith(exploding, { logger }), analyzeBody({ image }))
    expect(res.statusCode).toBe(502)
    expect(lines.join('')).not.toContain(image)
  })

  it('el redact de los logs cubre la clave de Gemini, la foto, el prompt y el cuerpo del pedido', () => {
    const { lines, logger } = capture()
    const app = buildApp({ auth, store: createMemoryStore() }, { logger })
    app.log.info(
      {
        body: { image: 'FOTO-SECRETA' },
        req: { body: 'CUERPO-SECRETO', headers: { 'x-goog-api-key': 'CLAVE-SECRETA', authorization: 'Bearer JWT-SECRETO' } },
        headers: { 'x-goog-api-key': 'CLAVE-SECRETA-2' },
        image: 'FOTO-SECRETA-2',
        prompt: 'PROMPT-SECRETO',
        apiKey: 'CLAVE-SECRETA-3',
        provider: { apiKey: 'CLAVE-SECRETA-4', image: 'FOTO-SECRETA-3', prompt: 'PROMPT-SECRETO-2' },
      },
      'prueba de redact',
    )
    const logged = lines.join('')
    expect(logged).toContain('prueba de redact')
    for (const secret of ['FOTO-SECRETA', 'CUERPO-SECRETO', 'CLAVE-SECRETA', 'JWT-SECRETO', 'PROMPT-SECRETO']) {
      expect(logged).not.toContain(secret)
    }
  })
})
