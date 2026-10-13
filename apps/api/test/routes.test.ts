import { Writable } from 'node:stream'
import { SCENE_MAX_BYTES, emptyEnvelope } from '@interiores/contract'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AuthVerifier } from '../src/auth.js'
import { LOGGER_REDACT, buildApp } from '../src/build-app.js'
import { createMemoryStore } from './support/memory-store.js'

const auth: AuthVerifier = async (token) => {
  if (token === 'token-a') return { id: 'user-a', token }
  if (token === 'token-b') return { id: 'user-b', token }
  return null
}
const headersA = { authorization: 'Bearer token-a' }
const headersB = { authorization: 'Bearer token-b' }

let store = createMemoryStore()
let app = buildApp({ auth, store })
beforeEach(() => {
  store = createMemoryStore()
  app = buildApp({ auth, store })
})

async function createProject(headers = headersA, payload: object = { name: 'Casa Alvear', kind: 'vivienda' }) {
  const res = await app.inject({ method: 'POST', url: '/v1/projects', headers, payload })
  return res.json() as { id: string; name: string; kind: string | null; templateId: string | null; version: number }
}

describe('GET /health', () => {
  it('responde ok sin autenticación', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})

describe('autenticación', () => {
  const routes: [string, string][] = [
    ['GET', '/v1/projects'],
    ['POST', '/v1/projects'],
    ['GET', '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'],
    ['PATCH', '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'],
    ['DELETE', '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'],
    ['PUT', '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11/scene'],
  ]

  it.each(routes)('%s %s sin token responde 401 con el cuerpo de error en castellano', async (method, url) => {
    const res = await app.inject({ method: method as 'GET', url })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('no_autenticado')
    expect(res.json().error.message).toMatch(/sesión/)
  })

  it('un token inválido responde 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/projects', headers: { authorization: 'Bearer falso' } })
    expect(res.statusCode).toBe(401)
  })
})

describe('proyectos', () => {
  it('POST crea el proyecto con 201 y version 1', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/projects', headers: headersA, payload: { name: '  Local Centro  ', kind: 'comercio' } })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ name: 'Local Centro', kind: 'comercio', version: 1 })
  })

  it('POST con templateId crea el proyecto recordando la plantilla de la que nació', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/projects', headers: headersA, payload: { name: 'Mi tienda', kind: 'comercio', templateId: 'concept-store' } })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ name: 'Mi tienda', kind: 'comercio', templateId: 'concept-store', version: 1 })
  })

  it('POST sin templateId (proyecto en blanco) devuelve templateId null', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/projects', headers: headersA, payload: { name: 'En blanco', kind: 'vivienda' } })
    expect(res.statusCode).toBe(201)
    expect(res.json().templateId).toBeNull()
  })

  it.each(['', 'Concept Store', 'concept_store', 'a'.repeat(41), 7])('POST con el templateId %j inválido responde 422 nombrando el campo', async (templateId) => {
    const res = await app.inject({ method: 'POST', url: '/v1/projects', headers: headersA, payload: { name: 'x', templateId } })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('datos_invalidos')
    expect(res.json().error.message).toContain('templateId')
    expect(await store.list({ userId: 'user-a', token: 'token-a' })).toEqual([])
  })

  it('POST con nombre vacío responde 422 en castellano', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/projects', headers: headersA, payload: { name: '   ' } })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('datos_invalidos')
    expect(res.json().error.message).toMatch(/no son válidos/)
  })

  it('POST con JSON roto responde 422, no 500', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/projects', headers: { ...headersA, 'content-type': 'application/json' }, payload: '{"name":' })
    expect(res.statusCode).toBe(422)
  })

  it('GET lista solo los proyectos propios, el más reciente primero', async () => {
    const first = await createProject()
    store.tick()
    const second = await createProject(headersA, { name: 'Segundo' })
    await createProject(headersB, { name: 'De B' })
    const res = await app.inject({ method: 'GET', url: '/v1/projects', headers: headersA })
    expect(res.statusCode).toBe(200)
    expect(res.json().map((p: { id: string }) => p.id)).toEqual([second.id, first.id])
  })

  it('GET por id devuelve la escena vacía y la versión', async () => {
    const p = await createProject()
    const res = await app.inject({ method: 'GET', url: `/v1/projects/${p.id}`, headers: headersA })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: p.id, version: 1, scene: emptyEnvelope() })
  })

  it('GET (lista y por id) devuelve la plantilla de origen, y null si el proyecto nació en blanco', async () => {
    const fromTemplate = await createProject(headersA, { name: 'Café', kind: 'comercio', templateId: 'cafe' })
    store.tick()
    const blank = await createProject(headersA, { name: 'En blanco' })

    const list = await app.inject({ method: 'GET', url: '/v1/projects', headers: headersA })
    expect(list.json().map((p: { id: string; templateId: string | null }) => [p.id, p.templateId])).toEqual([
      [blank.id, null],
      [fromTemplate.id, 'cafe'],
    ])

    const detail = await app.inject({ method: 'GET', url: `/v1/projects/${fromTemplate.id}`, headers: headersA })
    expect(detail.json()).toMatchObject({ id: fromTemplate.id, templateId: 'cafe' })
    const blankDetail = await app.inject({ method: 'GET', url: `/v1/projects/${blank.id}`, headers: headersA })
    expect(blankDetail.json().templateId).toBeNull()
  })

  it('GET del proyecto de otra persona responde 404, nunca 403', async () => {
    const p = await createProject()
    const res = await app.inject({ method: 'GET', url: `/v1/projects/${p.id}`, headers: headersB })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('no_encontrado')
  })

  it('un id mal formado responde 404 y no 500', async () => {
    for (const id of ['abc', '123', 'no-es-un-uuid']) {
      const res = await app.inject({ method: 'GET', url: `/v1/projects/${id}`, headers: headersA })
      expect(res.statusCode, id).toBe(404)
    }
  })

  it('PATCH cambia el nombre y devuelve el resumen', async () => {
    const p = await createProject()
    const res = await app.inject({ method: 'PATCH', url: `/v1/projects/${p.id}`, headers: headersA, payload: { name: 'Renombrado' } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: p.id, name: 'Renombrado' })
  })

  it('PATCH conserva la plantilla de origen y no deja cambiarla', async () => {
    const p = await createProject(headersA, { name: 'Súper', kind: 'comercio', templateId: 'supermercado' })
    const renamed = await app.inject({ method: 'PATCH', url: `/v1/projects/${p.id}`, headers: headersA, payload: { name: 'Súper Centro' } })
    expect(renamed.json()).toMatchObject({ name: 'Súper Centro', templateId: 'supermercado' })
    const tried = await app.inject({ method: 'PATCH', url: `/v1/projects/${p.id}`, headers: headersA, payload: { name: 'Súper Norte', templateId: 'cafe' } })
    expect(tried.statusCode).toBe(200)
    expect(tried.json()).toMatchObject({ name: 'Súper Norte', templateId: 'supermercado' })
  })

  it('PATCH sin campos responde 422 y ajeno responde 404', async () => {
    const p = await createProject()
    const empty = await app.inject({ method: 'PATCH', url: `/v1/projects/${p.id}`, headers: headersA, payload: {} })
    expect(empty.statusCode).toBe(422)
    const other = await app.inject({ method: 'PATCH', url: `/v1/projects/${p.id}`, headers: headersB, payload: { name: 'x' } })
    expect(other.statusCode).toBe(404)
  })

  it('DELETE responde 204 sin cuerpo y luego 404', async () => {
    const p = await createProject()
    const res = await app.inject({ method: 'DELETE', url: `/v1/projects/${p.id}`, headers: headersA })
    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')
    const again = await app.inject({ method: 'DELETE', url: `/v1/projects/${p.id}`, headers: headersA })
    expect(again.statusCode).toBe(404)
  })
})

describe('PUT /v1/projects/:id/scene', () => {
  const put = (id: string, headers: Record<string, string>, payload: unknown) =>
    app.inject({ method: 'PUT', url: `/v1/projects/${id}/scene`, headers, payload: payload as object })

  it('sin If-Match responde 428', async () => {
    const p = await createProject()
    const res = await put(p.id, headersA, emptyEnvelope())
    expect(res.statusCode).toBe(428)
    expect(res.json().error.code).toBe('falta_if_match')
  })

  it('guarda y devuelve la nueva versión; una versión vieja responde 409', async () => {
    const p = await createProject()
    const ok = await put(p.id, { ...headersA, 'if-match': '1' }, emptyEnvelope())
    expect(ok.statusCode).toBe(200)
    expect(ok.json()).toEqual({ version: 2 })
    const stale = await put(p.id, { ...headersA, 'if-match': '1' }, emptyEnvelope())
    expect(stale.statusCode).toBe(409)
    expect(stale.json().error.code).toBe('version_desactualizada')
  })

  it('acepta If-Match con comillas o validador débil y rechaza el resto con 422', async () => {
    const p = await createProject()
    expect((await put(p.id, { ...headersA, 'if-match': '"1"' }, emptyEnvelope())).statusCode).toBe(200)
    expect((await put(p.id, { ...headersA, 'if-match': 'W/"2"' }, emptyEnvelope())).statusCode).toBe(200)
    for (const bad of ['0', 'abc', '-1', '1.5', '""']) {
      const res = await put(p.id, { ...headersA, 'if-match': bad }, emptyEnvelope())
      expect(res.statusCode, bad).toBe(422)
    }
  })

  it('un envelope inválido responde 422', async () => {
    const p = await createProject()
    const res = await put(p.id, { ...headersA, 'if-match': '1' }, { schemaVersion: 1, graph: {} })
    expect(res.statusCode).toBe(422)
  })

  it('acepta un grafo vacío (la escena de un proyecto nuevo)', async () => {
    const p = await createProject()
    const res = await put(p.id, { ...headersA, 'if-match': '1' }, emptyEnvelope())
    expect(res.statusCode).toBe(200)
  })

  it('de otra persona responde 404', async () => {
    const p = await createProject()
    const res = await put(p.id, { ...headersB, 'if-match': '1' }, emptyEnvelope())
    expect(res.statusCode).toBe(404)
  })

  it('una escena mayor de 5 MB responde 413 con mensaje en castellano', async () => {
    const p = await createProject()
    const big = { ...emptyEnvelope(), graph: { nodes: { x: 'a'.repeat(SCENE_MAX_BYTES + 10) }, rootNodeIds: [] } }
    const res = await put(p.id, { ...headersA, 'if-match': '1', 'content-type': 'application/json' }, JSON.stringify(big))
    expect(res.statusCode).toBe(413)
    expect(res.json().error.code).toBe('escena_demasiado_grande')
  })
})

describe('registros (logs)', () => {
  it('el token nunca aparece en los logs, ni siquiera cuando el pedido falla', async () => {
    const lines: string[] = []
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString())
        cb()
      },
    })
    const logged = buildApp({ auth, store: createMemoryStore() }, { logger: { level: 'trace', stream, redact: LOGGER_REDACT } })
    await logged.inject({ method: 'GET', url: '/v1/projects', headers: { authorization: 'Bearer secreto-123' } })
    await logged.inject({ method: 'GET', url: '/v1/projects', headers: headersA })
    await logged.inject({ method: 'POST', url: '/v1/projects', headers: { ...headersA, 'content-type': 'application/json' }, payload: '{' })
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.join('')).not.toContain('secreto-123')
    expect(lines.join('')).not.toContain('token-a')
  })
})
