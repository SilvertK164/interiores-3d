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

  it('quita espacios, barras finales y entradas vacías de los orígenes (el navegador envía el origen sin barra)', () => {
    const cfg = loadConfig({ ...base, CORS_ORIGINS: ' https://web.vercel.app/ ,http://localhost:3000//,, ' })
    expect(cfg.corsOrigins).toEqual(['https://web.vercel.app', 'http://localhost:3000'])
  })

  it('GEMINI_API_KEY es opcional (sin ella el servidor arranca y el análisis responde que no está disponible)', () => {
    expect(loadConfig(base).geminiApiKey).toBeUndefined()
    expect(loadConfig({ ...base, GEMINI_API_KEY: '' }).geminiApiKey).toBeUndefined()
    expect(loadConfig({ ...base, GEMINI_API_KEY: '   ' }).geminiApiKey).toBeUndefined()
    expect(loadConfig({ ...base, GEMINI_API_KEY: ' clave-de-prueba ' }).geminiApiKey).toBe('clave-de-prueba')
  })

  it('VISION_MODEL parte de gemini-3.5-flash y se puede cambiar', () => {
    expect(loadConfig(base).visionModel).toBe('gemini-3.5-flash')
    expect(loadConfig({ ...base, VISION_MODEL: '' }).visionModel).toBe('gemini-3.5-flash')
    expect(loadConfig({ ...base, VISION_MODEL: ' gemini-otro ' }).visionModel).toBe('gemini-otro')
  })

  it('un error de configuración nunca repite la clave de Gemini', () => {
    expect(() => loadConfig({ GEMINI_API_KEY: 'AIza-no-debe-salir' })).toThrow(/SUPABASE_URL/)
    try {
      loadConfig({ GEMINI_API_KEY: 'AIza-no-debe-salir' })
    } catch (error) {
      expect(String(error)).not.toContain('AIza-no-debe-salir')
    }
  })
})
