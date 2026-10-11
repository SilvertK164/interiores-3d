import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

try {
  process.loadEnvFile(fileURLToPath(new URL('../../../../.env.test', import.meta.url)))
} catch {
  // sin .env.test: variables del proceso
}

export type TestAccount = { email: string; password: string }

/** Crea una cuenta de PRUEBA en Supabase local (contraseña aleatoria, nunca guardada). */
export async function createAccount(): Promise<TestAccount> {
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: service } = process.env
  if (!url || !service) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Corre pnpm db:start y luego pnpm db:env.')
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error('La prueba E2E solo crea usuarios en Supabase local.')
  const account = { email: `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, password: randomUUID() }
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const created = await admin.auth.admin.createUser({ ...account, email_confirm: true })
  if (created.error) throw new Error(`No se pudo crear el usuario de prueba: ${created.error.message}`)
  return account
}

export async function signInViaUi(page: Page, account: TestAccount): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(account.email)
  await page.getByLabel('Contraseña').fill(account.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL('**/proyectos')
}
