import { describe, expect, it, vi } from 'vitest'
import { createGeminiProvider } from '../src/analyze-room/gemini.js'
import { ProviderError } from '../src/analyze-room/types.js'

const catalog = [{ id: 'sofa', name: 'Sofá', category: 'furniture', tags: [] }]
const ok = () =>
  new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"furniture":[],"warnings":[]}' }] } }] }), { status: 200 })
const busy = () => new Response(JSON.stringify({ error: { status: 'UNAVAILABLE' } }), { status: 503 })
const request = { image: 'AAAA', mime: 'image/png' as const, catalog }

describe('createGeminiProvider: modelos de respaldo', () => {
  it('si el principal está saturado (503) prueba el siguiente modelo', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(busy()).mockResolvedValueOnce(ok())
    const result = await createGeminiProvider({ apiKey: 'k', fetchImpl, retryDelayMs: 0 })(request)
    expect(result).toEqual({ furniture: [], warnings: [] })
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('gemini-3.5-flash')
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain('gemini-3.7-flash')
  })

  it('un error que no se arregla cambiando de modelo (clave inválida, 403) no prueba otros', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }))
    await expect(createGeminiProvider({ apiKey: 'k', fetchImpl, retryDelayMs: 0 })(request)).rejects.toBeInstanceOf(ProviderError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('si la primera pasada falla en todos, una segunda pasada puede salvarlo', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => (fetchImpl.mock.calls.length <= 5 ? busy() : ok()))
    await expect(createGeminiProvider({ apiKey: 'k', fetchImpl, retryDelayMs: 0 })(request)).resolves.toEqual({ furniture: [], warnings: [] })
    expect(fetchImpl).toHaveBeenCalledTimes(6)
  })

  it('si todos están saturados falla con el último motivo', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => busy())
    await expect(createGeminiProvider({ apiKey: 'k', fetchImpl, retryDelayMs: 0 })(request)).rejects.toMatchObject({ reason: expect.stringContaining('http_503') })
    expect(fetchImpl).toHaveBeenCalledTimes(10)
  })
})
