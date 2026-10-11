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
