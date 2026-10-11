import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/build-app.js'
import { loadConfig } from '../src/config.js'
import { createMemoryStore } from './support/memory-store.js'

const WEB = 'https://interiores-web.vercel.app'
const OTHER = 'https://otra-web.vercel.app'
const auth = async () => null

const preflight = (origin: string) => ({
  method: 'OPTIONS' as const,
  url: '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11/scene',
  headers: {
    origin,
    'access-control-request-method': 'PUT',
    'access-control-request-headers': 'authorization,content-type,if-match',
  },
})

describe('CORS de la API (el origen de la web viene de CORS_ORIGINS)', () => {
  const app = buildApp({ auth, store: createMemoryStore(), corsOrigins: loadConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k', CORS_ORIGINS: `${WEB}/` }).corsOrigins })

  it('el preflight del origen configurado se acepta con los métodos y encabezados que usa la web', async () => {
    const res = await app.inject(preflight(WEB))
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe(WEB)
    expect(res.headers['access-control-allow-methods']).toContain('PUT')
    expect(String(res.headers['access-control-allow-headers']).toLowerCase()).toContain('if-match')
  })

  it('una respuesta normal al origen configurado lleva el permiso', async () => {
    const res = await app.inject({ method: 'GET', url: '/health', headers: { origin: WEB } })
    expect(res.statusCode).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe(WEB)
  })

  it('otro origen no recibe permiso', async () => {
    const res = await app.inject(preflight(OTHER))
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
    const normal = await app.inject({ method: 'GET', url: '/health', headers: { origin: OTHER } })
    expect(normal.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('valor por defecto seguro: sin orígenes configurados no se permite ninguno', async () => {
    for (const corsOrigins of [undefined, []]) {
      const closed = buildApp({ auth, store: createMemoryStore(), corsOrigins })
      const res = await closed.inject({ method: 'GET', url: '/health', headers: { origin: WEB } })
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    }
  })
})
