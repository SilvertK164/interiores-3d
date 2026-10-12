import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { emptyEnvelope } from '@interiores/contract'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSupabaseStore } from '../../src/supabase-store.js'
import type { Ctx } from '../../src/store.js'

try {
  process.loadEnvFile(fileURLToPath(new URL('../../../../.env.test', import.meta.url)))
} catch {
  // sin .env.test: variables del proceso (CI)
}
const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service } = process.env
if (!url || !anon || !service) {
  throw new Error('Faltan SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY para la prueba de integración. Corre pnpm db:start y luego pnpm db:env.')
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, service, opts)
const store = createSupabaseStore(url, anon)
const created: string[] = []

async function newCtx(label: string): Promise<Ctx> {
  const email = `rls-api-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`
  const password = randomUUID()
  const made = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (made.error || !made.data.user) throw new Error(made.error?.message)
  created.push(made.data.user.id)
  const client = createClient(url as string, anon as string, opts)
  const session = await client.auth.signInWithPassword({ email, password })
  if (session.error || !session.data.session) throw new Error(session.error?.message)
  return { userId: made.data.user.id, token: session.data.session.access_token }
}

let a: Ctx
let b: Ctx
beforeAll(async () => {
  a = await newCtx('a')
  b = await newCtx('b')
})
afterAll(async () => {
  for (const id of created) await admin.auth.admin.deleteUser(id)
})

describe('createSupabaseStore contra Supabase dev', () => {
  it('crea, lista, lee, guarda con versión y borra', async () => {
    const project = await store.create(a, { name: 'Integración', kind: 'vivienda' })
    expect(project.version).toBe(1)
    expect((await store.list(a)).map((p) => p.id)).toContain(project.id)
    const detail = await store.get(a, project.id)
    expect(detail?.scene).toEqual(emptyEnvelope())

    const ok = await store.saveScene(a, project.id, emptyEnvelope(), 1)
    expect(ok).toEqual({ kind: 'ok', version: 2 })
    expect(await store.saveScene(a, project.id, emptyEnvelope(), 1)).toEqual({ kind: 'conflict' })

    expect(await store.remove(a, project.id)).toBe(true)
    expect(await store.get(a, project.id)).toBeNull()
  })

  it('recuerda la plantilla de origen al crear, listar, leer y renombrar; sin plantilla devuelve null', async () => {
    const fromTemplate = await store.create(a, { name: 'Desde plantilla', kind: 'comercio', templateId: 'concept-store' })
    expect(fromTemplate).toMatchObject({ templateId: 'concept-store', version: 1 })
    const blank = await store.create(a, { name: 'En blanco' })
    expect(blank.templateId).toBeNull()

    const listed = await store.list(a)
    expect(listed.find((p) => p.id === fromTemplate.id)?.templateId).toBe('concept-store')
    expect(listed.find((p) => p.id === blank.id)?.templateId).toBeNull()
    expect((await store.get(a, fromTemplate.id))?.templateId).toBe('concept-store')
    expect((await store.update(a, fromTemplate.id, { name: 'Renombrada' }))?.templateId).toBe('concept-store')
    expect((await store.get(a, fromTemplate.id))?.templateId).toBe('concept-store')
  })

  it('un proyecto anterior a las plantillas (fila sin template_id) devuelve templateId null', async () => {
    const legacy = await admin.from('projects').insert({ owner_id: a.userId, name: 'Anterior a las plantillas', kind: 'vivienda' }).select('id').single()
    expect(legacy.error).toBeNull()
    const id = (legacy.data as { id: string }).id
    const scene = await admin.from('project_scenes').insert({ project_id: id, scene: emptyEnvelope(), schema_version: 1 })
    expect(scene.error).toBeNull()
    expect((await store.list(a)).find((p) => p.id === id)?.templateId).toBeNull()
    expect((await store.get(a, id))?.templateId).toBeNull()
  })

  it('otra persona no ve ni toca el proyecto (null / false / not_found)', async () => {
    const project = await store.create(a, { name: 'Privado', templateId: 'loft' })
    expect(await store.get(b, project.id)).toBeNull()
    expect(await store.update(b, project.id, { name: 'robado' })).toBeNull()
    expect(await store.remove(b, project.id)).toBe(false)
    expect(await store.saveScene(b, project.id, emptyEnvelope(), 1)).toEqual({ kind: 'not_found' })
    expect((await store.list(b)).map((p) => p.id)).not.toContain(project.id)
  })

  it('el tope de proyectos y los checks de la base llegan como AppError 4xx en castellano, no como 500', async () => {
    const c = await newCtx('limites')
    const rows = Array.from({ length: 50 }, (_, i) => ({ owner_id: c.userId, name: `Tope ${i}` }))
    expect((await admin.from('projects').insert(rows)).error).toBeNull()
    const quota = await store.create(c, { name: 'El 51' }).catch((e) => e)
    expect(quota).toMatchObject({ status: 422, code: 'limite_de_proyectos' })
    expect(quota.message).toMatch(/50 proyectos/)

    const first = (await store.list(c))[0] as { id: string }
    expect((await admin.from('project_scenes').insert({ project_id: first.id, scene: emptyEnvelope(), schema_version: 1 })).error).toBeNull()
    const big = { ...emptyEnvelope(), graph: { nodes: { x: 'a'.repeat(4 * 1024 * 1024) }, rootNodeIds: [] } }
    const tooBig = await store.saveScene(c, first.id, big, 1).catch((e) => e)
    expect(tooBig).toMatchObject({ status: 413, code: 'escena_demasiado_grande' })
  })
})
