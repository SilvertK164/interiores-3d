import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { buildApp } from '../src/build-app.js'
import { createMemoryStore } from './support/memory-store.js'

const normalize = (url: string) => url.replace(/:([A-Za-z]+)/g, '{$1}')

const spec = parse(readFileSync(fileURLToPath(new URL('../openapi.yaml', import.meta.url)), 'utf8')) as {
  paths: Record<string, Record<string, unknown>>
}

const registered = new Set<string>()
const app = buildApp({ auth: async () => null, store: createMemoryStore() }, { onRoute: (r) => registered.add(`${r.method} ${normalize(r.url)}`) })
// Fastify carga los plugins de forma diferida: las rutas recién se registran en ready().
await app.ready()

const fromYaml = new Set<string>()
for (const [path, item] of Object.entries(spec.paths)) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    if (item[method]) fromYaml.add(`${method.toUpperCase()} ${path}`)
  }
}
const real = new Set([...registered].filter((r) => !r.startsWith('HEAD ') && !r.startsWith('OPTIONS ')))

describe('contrato OpenAPI ↔ rutas registradas', () => {
  it('el registro de rutas no está vacío (las 6 de negocio y /health)', () => {
    expect(real.size).toBe(7)
  })

  it('toda ruta del código está en el yaml', () => {
    expect([...real].filter((r) => !fromYaml.has(r))).toEqual([])
  })

  it('toda ruta del yaml existe en el código', () => {
    expect([...fromYaml].filter((r) => !real.has(r))).toEqual([])
  })
})
