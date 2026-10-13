import { emptyEnvelope } from '@interiores/contract'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from '../src/lib/api/client.js'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const ID = '0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'

function clientWith(fetchImpl: typeof fetch, token: string | null = 'tok') {
  return createApiClient({ baseUrl: 'http://api.test', getToken: async () => token, fetchImpl })
}

describe('createApiClient', () => {
  it('envía el Bearer y valida la respuesta contra el contrato', async () => {
    const fetchImpl = vi.fn(async () =>
      json(200, [{ id: ID, name: 'Casa', kind: null, updatedAt: '2026-10-11T12:00:00.000Z' }]),
    )
    const list = await clientWith(fetchImpl as unknown as typeof fetch).listProjects()
    expect(list[0]?.name).toBe('Casa')
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://api.test/v1/projects')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('saveScene manda If-Match con la versión y el envelope', async () => {
    const fetchImpl = vi.fn(async () => json(200, { version: 3 }))
    const res = await clientWith(fetchImpl as unknown as typeof fetch).saveScene(ID, emptyEnvelope(), 2)
    expect(res).toEqual({ version: 3 })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/v1/projects/${ID}/scene`)
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['If-Match']).toBe('2')
  })

  it('convierte el cuerpo de error de la API en ApiError', async () => {
    const fetchImpl = vi.fn(async () => json(409, { error: { code: 'version_desactualizada', message: 'El proyecto cambió.' } }))
    await expect(clientWith(fetchImpl as unknown as typeof fetch).saveScene(ID, emptyEnvelope(), 1)).rejects.toMatchObject({
      status: 409,
      code: 'version_desactualizada',
    })
  })

  it('un 204 no tiene cuerpo', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    await expect(clientWith(fetchImpl as unknown as typeof fetch).deleteProject(ID)).resolves.toBeUndefined()
  })

  it('sin sesión lanza 401 antes de llamar a la red', async () => {
    const fetchImpl = vi.fn()
    const client = clientWith(fetchImpl as unknown as typeof fetch, null)
    await expect(client.listProjects()).rejects.toMatchObject({ status: 401 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('un fallo de red se vuelve ApiError con estado 0', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    const err = await clientWith(fetchImpl as unknown as typeof fetch).listProjects().catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(0)
  })

  it('saveScene con keepalive lo pasa a fetch cuando la escena es chica', async () => {
    const fetchImpl = vi.fn(async () => json(200, { version: 3 }))
    await clientWith(fetchImpl as unknown as typeof fetch).saveScene(ID, emptyEnvelope(), 2, { keepalive: true })
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.keepalive).toBe(true)
  })

  it('no usa keepalive si no se pide o si la escena pasa de 60 KB (fetch la rechazaría)', async () => {
    const fetchImpl = vi.fn(async () => json(200, { version: 3 }))
    const client = clientWith(fetchImpl as unknown as typeof fetch)
    await client.saveScene(ID, emptyEnvelope(), 2)
    const big = { ...emptyEnvelope(), graph: { nodes: { x: 'a'.repeat(70_000) }, rootNodeIds: [] } }
    await client.saveScene(ID, big, 3, { keepalive: true })
    const flags = fetchImpl.mock.calls.map((c) => (c as unknown as [string, RequestInit])[1].keepalive)
    expect(flags).toEqual([undefined, undefined])
  })
})
