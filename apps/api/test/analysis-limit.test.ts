import { ANALYSES_PER_HOUR } from '@interiores/contract'
import { describe, expect, it, vi } from 'vitest'
import { ProviderError, type VisionProvider } from '../src/analyze-room/types.js'
import type { AuthVerifier } from '../src/auth.js'
import { buildApp } from '../src/build-app.js'
import { CATALOG, JPEG, analyzeBody, b64 } from './support/images.js'
import { createMemoryStore } from './support/memory-store.js'
import { createMemoryUsage } from './support/memory-usage.js'
import { EMPTY_PLAN } from './support/plan.js'

const auth: AuthVerifier = async (token) => {
  if (token === 'token-a') return { id: 'user-a', token }
  if (token === 'token-b') return { id: 'user-b', token }
  return null
}
const headersA = { authorization: 'Bearer token-a' }
const headersB = { authorization: 'Bearer token-b' }
const RESULT = EMPTY_PLAN

function setup(provider: VisionProvider | null = async () => RESULT, usage = createMemoryUsage()) {
  const app = buildApp({ auth, store: createMemoryStore(), analysis: { provider, usage } })
  const send = (payload: unknown, headers: Record<string, string> = headersA) =>
    app.inject({ method: 'POST', url: '/v1/analyze-room', headers, payload: payload as object })
  return { app, send, usage }
}

describe('POST /v1/analyze-room: límite por persona', () => {
  it('permite 10 análisis por hora y el siguiente responde 429 con el mensaje en castellano', async () => {
    expect(ANALYSES_PER_HOUR).toBe(10)
    const provider = vi.fn<VisionProvider>(async () => RESULT)
    const { send } = setup(provider)
    for (let i = 0; i < 10; i++) expect((await send(analyzeBody())).statusCode, `análisis ${i + 1}`).toBe(200)
    const res = await send(analyzeBody())
    expect(res.statusCode).toBe(429)
    expect(res.json()).toEqual({ error: { code: 'limite_de_analisis', message: 'Llegaste al límite de 10 análisis por hora. Inténtalo más tarde.' } })
    expect(provider).toHaveBeenCalledTimes(10)
  })

  it('cuenta antes de llamar al proveedor: el intento queda registrado cuando el proveedor empieza a trabajar', async () => {
    const usage = createMemoryUsage()
    let seenDuringCall = -1
    const provider: VisionProvider = async () => {
      seenDuringCall = usage.count('user-a')
      return RESULT
    }
    await setup(provider, usage).send(analyzeBody())
    expect(seenDuringCall).toBe(1)
  })

  it('cada persona tiene su propio cupo', async () => {
    const { send } = setup()
    for (let i = 0; i < 10; i++) await send(analyzeBody())
    expect((await send(analyzeBody())).statusCode).toBe(429)
    expect((await send(analyzeBody(), headersB)).statusCode).toBe(200)
  })

  it('pasada una hora, el cupo se libera', async () => {
    const { send, usage } = setup()
    for (let i = 0; i < 10; i++) await send(analyzeBody())
    expect((await send(analyzeBody())).statusCode).toBe(429)
    usage.advance(60 * 60 * 1000 + 1)
    expect((await send(analyzeBody())).statusCode).toBe(200)
  })

  it('un análisis que falla en el proveedor igual cuenta (el intento ya gastó cuota)', async () => {
    const failing: VisionProvider = async () => {
      throw new ProviderError('http_500')
    }
    const { send, usage } = setup(failing)
    expect((await send(analyzeBody())).statusCode).toBe(502)
    expect(usage.count('user-a')).toBe(1)
  })

  it('los pedidos inválidos no gastan cupo: catálogo, foto, formato, ancho o cuerpo mal formados', async () => {
    const { send, usage } = setup()
    const bad = [
      analyzeBody({ catalog: [] }),
      analyzeBody({ image: 'no es base64!' }),
      analyzeBody({ image: b64(JPEG), mime: 'image/png' }),
      analyzeBody({ knownWidthM: 0 }),
      analyzeBody({ image: 'A'.repeat(4_194_305) }),
      analyzeBody({ catalog: [...CATALOG, CATALOG[0]] }),
    ]
    for (let round = 0; round < 3; round++) for (const payload of bad) expect((await send(payload)).statusCode).toBeGreaterThanOrEqual(400)
    expect(usage.count('user-a')).toBe(0)
    for (let i = 0; i < 10; i++) expect((await send(analyzeBody())).statusCode).toBe(200)
  })

  it('sin proveedor configurado (503) tampoco gasta cupo', async () => {
    const { send, usage } = setup(null)
    for (let i = 0; i < 12; i++) expect((await send(analyzeBody())).statusCode).toBe(503)
    expect(usage.count('user-a')).toBe(0)
  })

  it('sin sesión no se registra nada', async () => {
    const { app, usage } = setup()
    const res = await app.inject({ method: 'POST', url: '/v1/analyze-room', payload: analyzeBody() as object })
    expect(res.statusCode).toBe(401)
    expect(usage.count('user-a')).toBe(0)
  })

  it('si no se puede registrar el intento, falla cerrado: 500 y el proveedor no se llama', async () => {
    const provider = vi.fn<VisionProvider>(async () => RESULT)
    const app = buildApp({
      auth,
      store: createMemoryStore(),
      analysis: {
        provider,
        usage: {
          consume: async () => {
            throw new Error('la base no responde')
          },
        },
      },
    })
    const res = await app.inject({ method: 'POST', url: '/v1/analyze-room', headers: headersA, payload: analyzeBody() as object })
    expect(res.statusCode).toBe(500)
    expect(res.json().error.code).toBe('error_interno')
    expect(res.json().error.message).not.toMatch(/base/i)
    expect(provider).not.toHaveBeenCalled()
  })
})
