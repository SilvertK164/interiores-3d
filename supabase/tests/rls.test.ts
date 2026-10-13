import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type TestUser, createTestUser, deleteTestUser, plainClient, readEnv } from './support/env.js'

const env = readEnv()
const admin = plainClient(env.url, env.serviceKey)
let a: TestUser
let b: TestUser
let projectA: string

const emptyScene = { schemaVersion: 1, pascal: { core: '1.0.3' }, graph: { nodes: {}, rootNodeIds: [] } }

async function makeProject(user: TestUser, name: string): Promise<string> {
  const { data, error } = await user.client.from('projects').insert({ owner_id: user.id, name }).select('id').single()
  expect(error).toBeNull()
  return (data as { id: string }).id
}

beforeAll(async () => {
  a = await createTestUser(env, admin, 'a')
  b = await createTestUser(env, admin, 'b')
  projectA = await makeProject(a, 'Casa de A')
  const scene = await a.client.from('project_scenes').insert({ project_id: projectA, scene: emptyScene, schema_version: 1 })
  expect(scene.error).toBeNull()
})

afterAll(async () => {
  await deleteTestUser(admin, a)
  await deleteTestUser(admin, b)
})

describe('RLS de projects', () => {
  it('A ve su proyecto y B no ve nada', async () => {
    const mine = await a.client.from('projects').select('id')
    expect(mine.data?.map((r) => r.id)).toContain(projectA)
    const theirs = await b.client.from('projects').select('id')
    expect(theirs.error).toBeNull()
    expect(theirs.data).toEqual([])
  })

  it('B no puede modificar ni borrar el proyecto de A (0 filas afectadas)', async () => {
    const upd = await b.client.from('projects').update({ name: 'hackeado' }).eq('id', projectA).select('id')
    expect(upd.data).toEqual([])
    const del = await b.client.from('projects').delete().eq('id', projectA).select('id')
    expect(del.data).toEqual([])
    const still = await a.client.from('projects').select('name').eq('id', projectA).single()
    expect(still.data?.name).toBe('Casa de A')
  })

  it('B no puede crear un proyecto a nombre de A', async () => {
    const { error } = await b.client.from('projects').insert({ owner_id: a.id, name: 'intruso' })
    expect(error?.code).toBe('42501')
  })

  it('sin sesión (anon) no se puede leer la tabla', async () => {
    const anon: SupabaseClient = plainClient(env.url, env.anonKey)
    const { error } = await anon.from('projects').select('id')
    expect(error?.code).toBe('42501')
  })

  it('rechaza nombres vacíos, de más de 80 caracteres y tipos inválidos', async () => {
    const empty = await a.client.from('projects').insert({ owner_id: a.id, name: '' })
    expect(empty.error?.code).toBe('23514')
    const long = await a.client.from('projects').insert({ owner_id: a.id, name: 'x'.repeat(81) })
    expect(long.error?.code).toBe('23514')
    const kind = await a.client.from('projects').insert({ owner_id: a.id, name: 'ok', kind: 'oficina' })
    expect(kind.error?.code).toBe('23514')
  })
})

describe('plantilla de origen (projects.template_id)', () => {
  it('se guarda con el proyecto y otra cuenta no ve ese proyecto', async () => {
    const created = await a.client
      .from('projects')
      .insert({ owner_id: a.id, name: 'Desde plantilla', template_id: 'concept-store' })
      .select('id,template_id')
      .single()
    expect(created.error).toBeNull()
    expect(created.data?.template_id).toBe('concept-store')
    const id = (created.data as { id: string }).id

    const mine = await a.client.from('projects').select('template_id').eq('id', id).single()
    expect(mine.data?.template_id).toBe('concept-store')

    const theirs = await b.client.from('projects').select('id,template_id').eq('id', id)
    expect(theirs.error).toBeNull()
    expect(theirs.data).toEqual([])
    const byTemplate = await b.client.from('projects').select('id').eq('template_id', 'concept-store')
    expect(byTemplate.error).toBeNull()
    expect(byTemplate.data).toEqual([])
  })

  it('un proyecto sin plantilla (en blanco o anterior a la columna) guarda null', async () => {
    const blank = await a.client.from('projects').select('template_id').eq('id', projectA).single()
    expect(blank.error).toBeNull()
    expect(blank.data?.template_id).toBeNull()
  })

  it('B no puede cambiar la plantilla de un proyecto de A (0 filas afectadas)', async () => {
    const id = (
      (await a.client.from('projects').insert({ owner_id: a.id, name: 'Con loft', template_id: 'loft' }).select('id').single()).data as { id: string }
    ).id
    const upd = await b.client.from('projects').update({ template_id: 'cafe' }).eq('id', id).select('id')
    expect(upd.error).toBeNull()
    expect(upd.data).toEqual([])
    const still = await a.client.from('projects').select('template_id').eq('id', id).single()
    expect(still.data?.template_id).toBe('loft')
  })

  it.each([
    ['vacío', ''],
    ['con mayúsculas', 'Concept-Store'],
    ['con espacios', 'concept store'],
    ['con guion bajo', 'concept_store'],
    ['con salto de línea al final', 'loft\n'],
    ['de más de 40 caracteres', 'a'.repeat(41)],
  ])('rechaza un template_id %s', async (_motivo, templateId) => {
    const { error } = await a.client.from('projects').insert({ owner_id: a.id, name: 'ok', template_id: templateId })
    expect(error?.code).toBe('23514')
  })

  it('acepta los ids de las plantillas de muestra y uno de 40 caracteres', async () => {
    for (const templateId of ['concept-store', 'cafe', 'supermercado', 'loft', 'a'.repeat(40)]) {
      const { error } = await a.client.from('projects').insert({ owner_id: a.id, name: 'ok', template_id: templateId })
      expect(error, templateId).toBeNull()
    }
  })
})

describe('RLS de project_scenes', () => {
  it('B no lee la escena de A', async () => {
    const { data, error } = await b.client.from('project_scenes').select('project_id')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('B no puede crear una escena en un proyecto de A', async () => {
    const other = await makeProject(a, 'Otro de A')
    const { error } = await b.client.from('project_scenes').insert({ project_id: other, scene: emptyScene, schema_version: 1 })
    expect(error?.code).toBe('42501')
  })

  it('B no puede modificar la escena de A', async () => {
    const upd = await b.client.from('project_scenes').update({ version: 99 }).eq('project_id', projectA).select('project_id')
    expect(upd.data).toEqual([])
  })

  it('actualizar la escena sube la versión y el updated_at del proyecto', async () => {
    const before = await a.client.from('projects').select('updated_at').eq('id', projectA).single()
    await new Promise((r) => setTimeout(r, 25))
    const upd = await a.client.from('project_scenes').update({ scene: emptyScene, version: 2 }).eq('project_id', projectA).eq('version', 1).select('version')
    expect(upd.data).toEqual([{ version: 2 }])
    const after = await a.client.from('projects').select('updated_at').eq('id', projectA).single()
    expect(new Date(after.data?.updated_at).getTime()).toBeGreaterThan(new Date(before.data?.updated_at).getTime())
  })

  it('el bloqueo optimista: una segunda actualización con la versión vieja afecta 0 filas', async () => {
    const stale = await a.client.from('project_scenes').update({ scene: emptyScene, version: 2 }).eq('project_id', projectA).eq('version', 1).select('version')
    expect(stale.data).toEqual([])
  })

  it('borrar el proyecto borra su escena (cascada)', async () => {
    const id = await makeProject(a, 'Para borrar')
    await a.client.from('project_scenes').insert({ project_id: id, scene: emptyScene, schema_version: 1 })
    const del = await a.client.from('projects').delete().eq('id', id).select('id')
    expect(del.data).toEqual([{ id }])
    const left = await admin.from('project_scenes').select('project_id').eq('project_id', id)
    expect(left.data).toEqual([])
  })
})

describe('límites en la base (migración 003): no se saltan yendo directo a PostgREST', () => {
  const MIB = 1024 * 1024
  const sceneWith = (extra: Record<string, unknown>) => ({ ...emptyScene, ...extra })
  const newProject = async () => makeProject(a, `Límites ${Math.random().toString(36).slice(2, 8)}`)

  it('rechaza una escena de más de 4 MiB y acepta una de unos 3 MiB', async () => {
    const id = await newProject()
    const big = { ...emptyScene, graph: { nodes: { x: 'a'.repeat(4 * MIB) }, rootNodeIds: [] } }
    const rejected = await a.client.from('project_scenes').insert({ project_id: id, scene: big, schema_version: 1 })
    expect(rejected.error?.code).toBe('23514')
    expect(rejected.error?.message).toContain('project_scenes_scene_size')

    const fine = { ...emptyScene, graph: { nodes: { x: 'a'.repeat(3 * MIB) }, rootNodeIds: [] } }
    const accepted = await a.client.from('project_scenes').insert({ project_id: id, scene: fine, schema_version: 1 })
    expect(accepted.error).toBeNull()
    const grow = await a.client.from('project_scenes').update({ scene: big, version: 2 }).eq('project_id', id).select('version')
    expect(grow.error?.code).toBe('23514')
  })

  it.each([
    ['un arreglo en vez de un objeto', []],
    ['una cadena', 'hola'],
    ['sin schemaVersion', { pascal: { core: '1.0.3' }, graph: { nodes: {}, rootNodeIds: [] } }],
    ['schemaVersion como texto', sceneWith({ schemaVersion: '1' })],
    ['schemaVersion distinto de schema_version', sceneWith({ schemaVersion: 2 })],
    ['sin graph', { schemaVersion: 1, pascal: { core: '1.0.3' } }],
    ['graph como arreglo', sceneWith({ graph: [] })],
    ['graph sin nodes', sceneWith({ graph: { rootNodeIds: [] } })],
    ['graph sin rootNodeIds', sceneWith({ graph: { nodes: {} } })],
    ['sin pascal.core', { schemaVersion: 1, graph: { nodes: {}, rootNodeIds: [] } }],
  ])('rechaza una escena con la forma equivocada: %s', async (_motivo, scene) => {
    const id = await newProject()
    const { error } = await a.client.from('project_scenes').insert({ project_id: id, scene, schema_version: 1 })
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain('project_scenes_scene_shape')
  })

  it('rechaza nombres vacíos, de solo espacios, de 81 caracteres y con caracteres de control', async () => {
    for (const name of ['', '   ', 'x'.repeat(81), 'Casa\nAlvear', 'Casa\tAlvear', 'Casa\u007fAlvear']) {
      const { error } = await a.client.from('projects').insert({ owner_id: a.id, name })
      expect(error?.code, JSON.stringify(name)).toBe('23514')
    }
    const renamed = await a.client.from('projects').update({ name: 'a\nb' }).eq('id', projectA).select('id')
    expect(renamed.error?.code).toBe('23514')
    const ok = await a.client.from('projects').insert({ owner_id: a.id, name: 'x'.repeat(80) })
    expect(ok.error).toBeNull()
  })

  it('el proyecto 51 de una persona es rechazado con un mensaje en castellano y otra persona sigue pudiendo crear', async () => {
    const c = await createTestUser(env, admin, 'c')
    const d = await createTestUser(env, admin, 'd')
    try {
      const rows = Array.from({ length: 50 }, (_, i) => ({ owner_id: c.id, name: `Proyecto ${i + 1}` }))
      const bulk = await c.client.from('projects').insert(rows)
      expect(bulk.error).toBeNull()

      const over = await c.client.from('projects').insert({ owner_id: c.id, name: 'El 51' })
      expect(over.error?.code).toBe('53400')
      expect(over.error?.message).toMatch(/límite de 50 proyectos/)

      const other = await d.client.from('projects').insert({ owner_id: d.id, name: 'El primero de D' })
      expect(other.error).toBeNull()

      // Borrar uno libera un cupo.
      const first = await c.client.from('projects').select('id').limit(1).single()
      await c.client.from('projects').delete().eq('id', (first.data as { id: string }).id)
      const again = await c.client.from('projects').insert({ owner_id: c.id, name: 'Otra vez el 50' })
      expect(again.error).toBeNull()
    } finally {
      await deleteTestUser(admin, c)
      await deleteTestUser(admin, d)
    }
  })
})
