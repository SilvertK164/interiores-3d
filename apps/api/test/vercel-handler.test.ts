import { once } from 'node:events'
import { IncomingMessage, ServerResponse } from 'node:http'
import type { Socket } from 'node:net'
import { Duplex } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import handlerFromEntry from '../api/index.js'
import type { AuthVerifier } from '../src/auth.js'
import { buildApp } from '../src/build-app.js'
import { type VercelHandler, createVercelHandler } from '../src/vercel-handler.js'
import { createMemoryStore } from './support/memory-store.js'

const WEB = 'https://interiores-web.vercel.app'
// Variables inventadas: la app se arma con ellas, pero ninguna prueba abre una conexión a Supabase.
const env = { SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co', SUPABASE_ANON_KEY: 'clave-publica-falsa', LOG_LEVEL: 'silent' }

type Call = { method?: string; url: string; headers?: Record<string, string>; body?: unknown }

/**
 * Petición y respuesta de Node armadas en memoria, como las que entrega Vercel: la respuesta escribe en un
 * "socket" falso y de ahí se lee lo que viajaría por la red (línea de estado, encabezados y cuerpo).
 */
async function invoke(handler: VercelHandler, { method = 'GET', url, headers = {}, body }: Call) {
  const wire: Buffer[] = []
  const socket = new Duplex({
    read() {},
    write(chunk, _encoding, done) {
      wire.push(Buffer.from(chunk))
      done()
    },
  }) as unknown as Socket
  const req = new IncomingMessage(socket)
  req.method = method
  req.url = url
  const payload = body === undefined ? undefined : JSON.stringify(body)
  req.headers = {
    host: 'api.interiores.test',
    ...(payload ? { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(payload)) } : {}),
    ...headers,
  }
  if (payload) req.push(payload)
  req.complete = true // lo que hace el analizador HTTP al terminar el mensaje; sin esto Node da la petición por abortada
  req.push(null)
  const res = new ServerResponse(req)
  res.assignSocket(socket)
  const finished = once(res, 'finish')
  await handler(req, res)
  await finished

  const raw = Buffer.concat(wire).toString('utf8')
  const [head = '', ...rest] = raw.split('\r\n\r\n')
  const [statusLine = '', ...headerLines] = head.split('\r\n')
  const text = rest.join('\r\n\r\n')
  return {
    status: Number(statusLine.split(' ')[1]),
    headers: Object.fromEntries(
      headerLines.map((line) => [line.slice(0, line.indexOf(':')).toLowerCase(), line.slice(line.indexOf(':') + 1).trim()]),
    ),
    json: () => JSON.parse(text) as Record<string, unknown>,
  }
}

afterEach(() => vi.restoreAllMocks())

describe('api/index.ts (punto de entrada de Vercel)', () => {
  it('exporta el manejador por defecto', () => {
    expect(typeof handlerFromEntry).toBe('function')
  })
})

describe('manejador de Vercel con el cableado de producción', () => {
  const handler = createVercelHandler({ env: { ...env, CORS_ORIGINS: `${WEB}/` } })

  it('GET /health responde 200 con { status: "ok" }', async () => {
    const res = await invoke(handler, { url: '/health' })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(res.json()).toEqual({ status: 'ok' })
  })

  it('una ruta protegida sin token responde 401 en castellano', async () => {
    const res = await invoke(handler, { url: '/v1/projects' })
    expect(res.status).toBe(401)
    expect(res.json()).toEqual({
      error: { code: 'no_autenticado', message: 'Tu sesión no es válida o venció. Vuelve a ingresar.' },
    })
  })

  it('una ruta que no existe responde 404 en castellano', async () => {
    const res = await invoke(handler, { url: '/no-existe' })
    expect(res.status).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'no_encontrado', message: 'No encontramos esa dirección.' } })
  })

  it('el preflight de CORS acepta el origen de CORS_ORIGINS (aunque lleve barra final) y no otros', async () => {
    const preflight = (origin: string) => ({
      method: 'OPTIONS',
      url: '/v1/projects',
      headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' },
    })
    const allowed = await invoke(handler, preflight(WEB))
    expect(allowed.status).toBe(204)
    expect(allowed.headers['access-control-allow-origin']).toBe(WEB)

    const denied = await invoke(handler, preflight('https://otra-web.vercel.app'))
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('sin CORS_ORIGINS no se permite ningún origen', async () => {
    const closed = createVercelHandler({ env })
    const res = await invoke(closed, { url: '/health', headers: { origin: WEB } })
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('manejador de Vercel con una app de prueba (almacén en memoria)', () => {
  const auth: AuthVerifier = async (token) => (token === 'token-a' ? { id: 'user-a', token } : null)

  it('el cuerpo JSON de la petición llega entero a Fastify', async () => {
    const handler = createVercelHandler({ env, build: () => buildApp({ auth, store: createMemoryStore() }) })
    const res = await invoke(handler, {
      method: 'POST',
      url: '/v1/projects',
      headers: { authorization: 'Bearer token-a' },
      body: { name: 'Casa Alvear', kind: 'vivienda' },
    })
    expect(res.status).toBe(201)
    expect(res.json()).toMatchObject({ name: 'Casa Alvear', kind: 'vivienda' })
  })

  it('arma la app una sola vez por instancia y la reutiliza en las siguientes peticiones', async () => {
    const build = vi.fn(() => buildApp({ auth, store: createMemoryStore() }))
    const handler = createVercelHandler({ env, build })
    await invoke(handler, { url: '/health' })
    await invoke(handler, { url: '/health' })
    expect(build).toHaveBeenCalledTimes(1)
    expect(build).toHaveBeenCalledWith(expect.objectContaining({ supabaseUrl: env.SUPABASE_URL }))
  })
})

describe('manejador de Vercel mal configurado', () => {
  it('sin variables de entorno responde 500 genérico y deja en el registro qué faltaba, sin valores', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const handler = createVercelHandler({ env: {} })
    const res = await invoke(handler, { url: '/health' })
    expect(res.status).toBe(500)
    expect(res.json()).toEqual({
      error: { code: 'error_interno', message: 'Ocurrió un error inesperado. Inténtalo de nuevo.' },
    })
    const logged = log.mock.calls.flat().join(' ')
    expect(logged).toContain('SUPABASE_URL, SUPABASE_ANON_KEY')
  })

  it('reintenta armar la app en la petición siguiente (por si la configuración se corrigió)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const shared: Record<string, string | undefined> = {}
    const handler = createVercelHandler({ env: shared })
    expect((await invoke(handler, { url: '/health' })).status).toBe(500)
    Object.assign(shared, env)
    expect((await invoke(handler, { url: '/health' })).status).toBe(200)
  })
})
