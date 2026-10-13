import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos: lo usa next.config.mjs
import { buildSecurityHeaders, originOf } from '../security-headers.mjs'
// @ts-expect-error next.config.mjs no tiene tipos
import nextConfig from '../next.config.mjs'

type Header = { key: string; value: string }
const env = { NEXT_PUBLIC_API_URL: 'https://madori-api.vercel.app', NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' }
const byKey = (headers: Header[]) => Object.fromEntries(headers.map((h) => [h.key, h.value]))

describe('cabeceras de seguridad de la web', () => {
  const h = byKey(buildSecurityHeaders(env, true))

  it('lleva las cabeceras que no dependen de Pascal', () => {
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d{7,}/)
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(h['Permissions-Policy']).toContain('camera=()')
    expect(h['Permissions-Policy']).toContain('geolocation=()')
    expect(h['X-Frame-Options']).toBe('DENY')
  })

  it('la CSP obligatoria impide ser enmarcada, otra base y plugins', () => {
    const csp = h['Content-Security-Policy']
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("form-action 'self'")
  })

  it('la CSP completa (en modo informe) permite lo que Pascal y WebGL necesitan y nada más', () => {
    const csp = h['Content-Security-Policy-Report-Only']
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("'wasm-unsafe-eval'")
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).toMatch(/worker-src[^;]*blob:/)
    expect(csp).toMatch(/img-src[^;]*blob:[^;]*data:|img-src[^;]*data:[^;]*blob:/)
    const connect = /connect-src ([^;]*)/.exec(csp ?? '')?.[1] ?? ''
    for (const origin of ['https://madori-api.vercel.app', 'https://abc.supabase.co', 'https://cdn.jsdelivr.net', 'https://www.gstatic.com'])
      expect(connect).toContain(origin)
    expect(connect).not.toMatch(/(^| )\*( |$)/)
    expect(connect).not.toMatch(/(^| )https:( |$)/)
  })

  it('la web ya no se conecta a ningún servicio de TP3: ni localhost:8000 ni NEXT_PUBLIC_LAB_PHOTO_URL (el análisis pasa por la API)', () => {
    const connect = /connect-src ([^;]*)/.exec(h['Content-Security-Policy-Report-Only'] ?? '')?.[1] ?? ''
    expect(connect).not.toMatch(/localhost|127\.0\.0\.1|:8000/)
    const withLab = byKey(buildSecurityHeaders({ ...env, NEXT_PUBLIC_LAB_PHOTO_URL: 'https://tp3.example.com' }, true))
    expect(withLab['Content-Security-Policy-Report-Only']).not.toContain('tp3.example.com')
  })

  it('en desarrollo solo manda lo inofensivo (Next necesita eval y websockets)', () => {
    const dev = byKey(buildSecurityHeaders(env, false))
    expect(dev['X-Content-Type-Options']).toBe('nosniff')
    expect(dev['Content-Security-Policy-Report-Only']).toBeUndefined()
    expect(dev['Strict-Transport-Security']).toBeUndefined()
  })

  it('originOf descarta rutas y valores que no son URL', () => {
    expect(originOf('https://x.supabase.co/rest/v1')).toBe('https://x.supabase.co')
    expect(originOf('no es una url')).toBeNull()
    expect(originOf(undefined)).toBeNull()
  })

  it('next.config.mjs aplica las cabeceras a todas las rutas', async () => {
    const rules = await (nextConfig as { headers: () => Promise<{ source: string; headers: Header[] }[]> }).headers()
    expect(rules.some((r) => r.source === '/:path*' && r.headers.some((x) => x.key === 'X-Content-Type-Options'))).toBe(true)
  })
})
