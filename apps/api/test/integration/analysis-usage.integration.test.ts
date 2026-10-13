import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSupabaseUsage } from '../../src/analysis-usage.js'
import { AppError } from '../../src/errors.js'
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
const usage = createSupabaseUsage(url, anon)
const created: string[] = []

async function newCtx(label: string): Promise<Ctx> {
  const email = `rls-uso-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`
  const password = randomUUID()
  const made = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (made.error || !made.data.user) throw new Error(made.error?.message)
  created.push(made.data.user.id)
  const client = createClient(url as string, anon as string, opts)
  const session = await client.auth.signInWithPassword({ email, password })
  if (session.error || !session.data.session) throw new Error(session.error?.message)
  return { userId: made.data.user.id, token: session.data.session.access_token }
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (e: unknown) => e,
  )
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

describe('createSupabaseUsage contra Supabase dev', () => {
  it('registra hasta 10 intentos por hora y el 11 es el 429 en castellano', async () => {
    for (let i = 0; i < 10; i++) await usage.consume(a)
    const error = await failureOf(usage.consume(a))
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ status: 429, code: 'limite_de_analisis', message: 'Llegaste al límite de 10 análisis por hora. Inténtalo más tarde.' })
    const rows = await admin.from('analysis_usage').select('id', { count: 'exact', head: true }).eq('user_id', a.userId)
    expect(rows.count).toBe(10)
  })

  it('otra persona tiene su propio cupo', async () => {
    await expect(usage.consume(b)).resolves.toBeUndefined()
    const rows = await admin.from('analysis_usage').select('id', { count: 'exact', head: true }).eq('user_id', b.userId)
    expect(rows.count).toBe(1)
  })

  it('con un token que la base no acepta no registra nada y el error no se disfraza de límite', async () => {
    const error = await failureOf(usage.consume({ userId: b.userId, token: 'token-invalido' }))
    expect(error).toBeDefined()
    expect(error).not.toBeInstanceOf(AppError)
  })

  it('un token de otra persona no puede gastar el cupo de la primera (el intento se registra a nombre de quien lo firma)', async () => {
    const before = await admin.from('analysis_usage').select('id', { count: 'exact', head: true }).eq('user_id', a.userId)
    const error = await failureOf(usage.consume({ userId: a.userId, token: b.token }))
    expect(error).toBeDefined()
    const after = await admin.from('analysis_usage').select('id', { count: 'exact', head: true }).eq('user_id', a.userId)
    expect(after.count).toBe(before.count)
  })
})
