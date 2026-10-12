import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/build-app.js'
import { createMemoryStore } from './support/memory-store.js'

describe('cabeceras de seguridad de la API', () => {
  const app = buildApp({ auth: async () => null, store: createMemoryStore() })

  it.each([
    ['una respuesta correcta', '/health'],
    ['un 401', '/v1/projects'],
    ['un 404', '/no-existe'],
  ])('%s lleva nosniff, sin caché y sin referrer', async (_name, url) => {
    const res = await app.inject({ method: 'GET', url })
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['referrer-policy']).toBe('no-referrer')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d{7,}/)
    expect(res.headers['content-security-policy']).toContain("default-src 'none'")
  })
})
