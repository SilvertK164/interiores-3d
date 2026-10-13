import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { type SupabaseClient, createClient } from '@supabase/supabase-js'

export type Env = { url: string; anonKey: string; serviceKey: string }

export function readEnv(): Env {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../../../.env.test', import.meta.url)))
  } catch {
    // sin .env.test: se usan las variables del proceso (CI)
  }
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = process.env
  const missing = Object.entries({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey })
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables para las pruebas contra Supabase dev: ${missing.join(', ')}. Copia .env.example a .env.test y complétalo.`,
    )
  }
  return { url: url as string, anonKey: anonKey as string, serviceKey: serviceKey as string }
}

export const plainClient = (url: string, key: string): SupabaseClient =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

export type TestUser = { id: string; email: string; client: SupabaseClient }

export async function createTestUser(env: Env, admin: SupabaseClient, label: string): Promise<TestUser> {
  const email = `rls-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  const password = randomUUID()
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) throw new Error(`No se pudo crear el usuario de prueba: ${created.error?.message}`)
  const client = plainClient(env.url, env.anonKey)
  const signIn = await client.auth.signInWithPassword({ email, password })
  if (signIn.error) throw new Error(`No se pudo iniciar sesión con el usuario de prueba: ${signIn.error.message}`)
  return { id: created.data.user.id, email, client }
}

export async function deleteTestUser(admin: SupabaseClient, user: TestUser | undefined): Promise<void> {
  if (user) await admin.auth.admin.deleteUser(user.id)
}
