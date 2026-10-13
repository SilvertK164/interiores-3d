import { describe, expect, it } from 'vitest'
// @ts-expect-error next.config.mjs no tiene tipos
import nextConfig from '../next.config.mjs'

describe('next.config: /laboratorio pasó a /escena-desde-foto', () => {
  it('redirige /laboratorio a /escena-desde-foto de forma permanente (los enlaces y favoritos viejos siguen sirviendo)', async () => {
    const redirects = await nextConfig.redirects?.()
    expect(redirects).toContainEqual({ source: '/laboratorio', destination: '/escena-desde-foto', permanent: true })
  })
})
