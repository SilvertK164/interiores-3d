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

/**
 * /login llega ya dibujada desde el servidor: hasta que React la hidrata, lo escrito se pierde y los clics no hacen
 * nada. Los nodos hidratados guardan sus propiedades en `__reactProps$…`; si esa señal no existiera, tras 3 s se sigue
 * igual (la prueba solo se vuelve más lenta, no se cuelga).
 */
export async function waitForHydration(page: Page): Promise<void> {
  const hydrated = () => {
    const tab = document.querySelector('[role="tab"]')
    return tab !== null && Object.keys(tab).some((key) => key.startsWith('__reactProps'))
  }
  await page.waitForFunction(hydrated, undefined, { timeout: 3_000 }).catch(() => undefined)
}

/** Abre /login (con `search`, por ejemplo "?modo=crear") y espera a que esté lista para usarse. */
export async function gotoLogin(page: Page, search = ''): Promise<void> {
  await page.goto(`/login${search}`)
  await waitForHydration(page)
}

/**
 * Rellena y envía la pestaña "Ingresar", que es la que abre /login. No espera ninguna página: quien la usa decide a dónde
 * debería llegar. La contraseña se busca con `exact` porque el botón "Mostrar contraseña" también la nombra.
 */
export async function submitLogin(page: Page, account: TestAccount): Promise<void> {
  await page.getByLabel('Correo').fill(account.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
}

export async function signInViaUi(page: Page, account: TestAccount): Promise<void> {
  await gotoLogin(page)
  await submitLogin(page, account)
  await page.waitForURL('**/proyectos')
}

/** Una cuenta que todavía no existe (para registrarla por la pestaña "Crear cuenta"). Contraseña aleatoria, nunca guardada. */
export function newAccount(): TestAccount {
  return { email: `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, password: randomUUID() }
}

/**
 * Las pruebas que registran cuentas por la interfaz solo pueden hacerlo contra Supabase local. Si la aplicación apunta a
 * otra base (por ejemplo la de la nube), el registro se aborta antes de salir del navegador y la prueba falla con un
 * mensaje claro. Llámala antes de abrir /login.
 */
export async function blockNonLocalSignups(page: Page): Promise<void> {
  await page.route('**/auth/v1/signup**', async (route) => {
    const { hostname } = new URL(route.request().url())
    if (/^(127\.0\.0\.1|localhost)$/.test(hostname)) return route.continue()
    await route.abort('blockedbyclient')
    throw new Error(`La prueba intentó crear una cuenta en ${hostname}: solo se permite Supabase local (pnpm db:start y pnpm db:env).`)
  })
}
