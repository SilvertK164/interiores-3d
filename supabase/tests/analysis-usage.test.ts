import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type TestUser, createTestUser, deleteTestUser, plainClient, readEnv } from './support/env.js'

// Migración 004: intentos de análisis de fotos por persona (RLS y tope de 10 por hora). Mismo método que rls.test.ts:
// dos usuarios reales de la base local y nada de mocks.
const env = readEnv()
const admin = plainClient(env.url, env.serviceKey)
let a: TestUser
let b: TestUser

const attempt = (user: TestUser, extra: Record<string, unknown> = {}) => user.client.from('analysis_usage').insert({ user_id: user.id, ...extra })
const LIMIT_MESSAGE = /límite de 10 análisis por hora/

beforeAll(async () => {
  a = await createTestUser(env, admin, 'uso-a')
  b = await createTestUser(env, admin, 'uso-b')
})

afterAll(async () => {
  await deleteTestUser(admin, a)
  await deleteTestUser(admin, b)
})

describe('RLS de analysis_usage', () => {
  it('cada persona registra sus intentos y solo ve los suyos', async () => {
    expect((await attempt(a)).error).toBeNull()
    const mine = await a.client.from('analysis_usage').select('user_id')
    expect(mine.error).toBeNull()
    expect(mine.data?.length).toBeGreaterThanOrEqual(1)
    expect(mine.data?.every((row) => row.user_id === a.id)).toBe(true)
    const theirs = await b.client.from('analysis_usage').select('user_id')
    expect(theirs.error).toBeNull()
    expect(theirs.data).toEqual([])
  })

  it('B no puede registrar un intento a nombre de A', async () => {
    const { error } = await b.client.from('analysis_usage').insert({ user_id: a.id })
    expect(error?.code).toBe('42501')
  })

  it('sin sesión (anon) no se puede leer ni escribir', async () => {
    const anon: SupabaseClient = plainClient(env.url, env.anonKey)
    expect((await anon.from('analysis_usage').select('id')).error?.code).toBe('42501')
    expect((await anon.from('analysis_usage').insert({ user_id: a.id })).error?.code).toBe('42501')
  })

  it('nadie puede modificar ni borrar un intento, ni siquiera el propio: así el límite no se salta borrando', async () => {
    await attempt(a)
    const own = await a.client.from('analysis_usage').select('id').limit(1).single()
    const id = (own.data as { id: string }).id
    expect((await a.client.from('analysis_usage').delete().eq('id', id)).error?.code).toBe('42501')
    expect((await a.client.from('analysis_usage').update({ created_at: '2000-01-01T00:00:00Z' }).eq('id', id)).error?.code).toBe('42501')
    expect((await b.client.from('analysis_usage').delete().eq('id', id)).error?.code).toBe('42501')
    const still = await a.client.from('analysis_usage').select('id').eq('id', id)
    expect(still.data).toEqual([{ id }])
  })

  it('la hora del intento la pone el servidor: un created_at inventado no vale', async () => {
    const c = await createTestUser(env, admin, 'uso-hora')
    try {
      const inserted = await c.client.from('analysis_usage').insert({ user_id: c.id, created_at: '2000-01-01T00:00:00Z' }).select('created_at').single()
      expect(inserted.error).toBeNull()
      expect(Date.now() - new Date((inserted.data as { created_at: string }).created_at).getTime()).toBeLessThan(60_000)
    } finally {
      await deleteTestUser(admin, c)
    }
  })

  it('borrar la cuenta borra sus intentos (cascada)', async () => {
    const g = await createTestUser(env, admin, 'uso-cascada')
    await attempt(g)
    await deleteTestUser(admin, g)
    const left = await admin.from('analysis_usage').select('id').eq('user_id', g.id)
    expect(left.data).toEqual([])
  })
})

describe('tope de 10 análisis por hora (disparador de la migración 004)', () => {
  it('el intento 11 de la última hora es rechazado con un mensaje en castellano y otra persona sigue pudiendo', async () => {
    const c = await createTestUser(env, admin, 'uso-limite-c')
    const d = await createTestUser(env, admin, 'uso-limite-d')
    try {
      for (let i = 0; i < 10; i++) expect((await attempt(c)).error, `intento ${i + 1}`).toBeNull()
      const over = await attempt(c)
      expect(over.error?.code).toBe('53400')
      expect(over.error?.message).toMatch(LIMIT_MESSAGE)
      expect((await attempt(d)).error).toBeNull()
      const count = await c.client.from('analysis_usage').select('id', { count: 'exact', head: true })
      expect(count.count).toBe(10)
    } finally {
      await deleteTestUser(admin, c)
      await deleteTestUser(admin, d)
    }
  })

  it('una sola petición con 11 filas tampoco pasa y no deja ninguna', async () => {
    const e = await createTestUser(env, admin, 'uso-lote')
    try {
      const rows = Array.from({ length: 11 }, () => ({ user_id: e.id }))
      const bulk = await e.client.from('analysis_usage').insert(rows)
      expect(bulk.error?.code).toBe('53400')
      const count = await e.client.from('analysis_usage').select('id', { count: 'exact', head: true })
      expect(count.count).toBe(0)
    } finally {
      await deleteTestUser(admin, e)
    }
  })

  it('diez pedidos simultáneos de una misma persona más uno: el candado impide que se pasen a la vez', async () => {
    const h = await createTestUser(env, admin, 'uso-carrera')
    try {
      const results = await Promise.all(Array.from({ length: 14 }, () => attempt(h)))
      expect(results.filter((r) => r.error === null)).toHaveLength(10)
      expect(results.filter((r) => r.error?.code === '53400')).toHaveLength(4)
    } finally {
      await deleteTestUser(admin, h)
    }
  })

  it('los intentos de hace más de una hora ya no cuentan', async () => {
    const f = await createTestUser(env, admin, 'uso-ventana')
    try {
      for (let i = 0; i < 10; i++) expect((await attempt(f)).error).toBeNull()
      expect((await attempt(f)).error?.code).toBe('53400')
      const old = new Date(Date.now() - 61 * 60_000).toISOString()
      const aged = await admin.from('analysis_usage').update({ created_at: old }).eq('user_id', f.id)
      expect(aged.error).toBeNull()
      expect((await attempt(f)).error).toBeNull()
    } finally {
      await deleteTestUser(admin, f)
    }
  })
})
