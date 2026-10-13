import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'

describe('loadConfig', () => {
  const base = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' }

  it('falla de forma visible si faltan variables obligatorias', () => {
    expect(() => loadConfig({})).toThrow('SUPABASE_URL, SUPABASE_ANON_KEY')
  })

  it('usa valores por defecto y separa los orígenes CORS', () => {
    const cfg = loadConfig({ ...base, CORS_ORIGINS: 'http://a.com, http://b.com ' })
    expect(cfg.port).toBe(3001)
    expect(cfg.corsOrigins).toEqual(['http://a.com', 'http://b.com'])
    expect(cfg.logLevel).toBe('info')
  })

  it('sin CORS_ORIGINS no habilita ningún origen', () => {
    expect(loadConfig(base).corsOrigins).toEqual([])
  })
})
