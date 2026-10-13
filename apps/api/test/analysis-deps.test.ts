import { describe, expect, it, vi } from 'vitest'
import { createAnalysisDeps } from '../src/analysis-deps.js'
import type { Config } from '../src/config.js'
import { CATALOG, JPEG, b64 } from './support/images.js'

const config = (extra: Partial<Config> = {}): Config => ({
  supabaseUrl: 'https://x.supabase.co',
  supabaseAnonKey: 'anon',
  corsOrigins: [],
  port: 3001,
  logLevel: 'info',
  geminiApiKey: undefined,
  visionModel: 'gemini-3.5-flash',
  ...extra,
})

describe('createAnalysisDeps', () => {
  it('sin GEMINI_API_KEY no hay proveedor: el análisis responde 503 pero la API arranca', () => {
    expect(createAnalysisDeps(config()).provider).toBeNull()
  })

  it('con clave arma el proveedor de Gemini con el modelo configurado y la clave en la cabecera', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"furniture":[],"warnings":[]}' }] } }] }), { status: 200 }))
    const { provider } = createAnalysisDeps(config({ geminiApiKey: 'clave-de-prueba', visionModel: 'gemini-otro' }), fetchImpl as unknown as typeof fetch)
    expect(provider).toBeTypeOf('function')
    await provider?.({ image: b64(JPEG), mime: 'image/jpeg', catalog: CATALOG })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/models/gemini-otro:generateContent')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('clave-de-prueba')
  })
})
