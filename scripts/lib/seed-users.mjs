// Cuentas de PRUEBA para la base local de Supabase (Docker). Son fijas a propósito: sirven para entrar sin registrarse
// mientras no exista la base en la nube. Solo se crean contra 127.0.0.1 o localhost; nunca se usan fuera de la máquina.
export const DEV_USERS = [
  { email: 'silvert@interiores.test', password: 'Interiores-dev-2026', name: 'Silvert' },
  { email: 'victoria@interiores.test', password: 'Interiores-dev-2026', name: 'Victoria' },
  { email: 'demo@interiores.test', password: 'Interiores-dev-2026', name: 'Demo' },
]

export function assertLocalSupabase(url) {
  if (!url) throw new Error('Falta SUPABASE_URL. Corre pnpm db:start y pnpm db:env.')
  let host
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error('SUPABASE_URL no es una dirección válida.')
  }
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host)) {
    throw new Error('Las cuentas de prueba se crean solo con la base local (127.0.0.1 o localhost), nunca en la nube.')
  }
}

/** Crea las cuentas con el correo ya confirmado. Si una ya existe la informa; cualquier otro error se propaga sin mostrar la clave. */
export async function seedUsers({ url, serviceKey, fetchImpl = fetch, users = DEV_USERS }) {
  assertLocalSupabase(url)
  const results = []
  for (const user of users) {
    const response = await fetchImpl(`${url.replace(/\/$/, '')}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ email: user.email, password: user.password, email_confirm: true, user_metadata: { name: user.name } }),
    })
    if (response.ok) {
      results.push({ email: user.email, status: 'creada' })
      continue
    }
    const detail = await response.text().catch(() => '')
    if (response.status === 422 && /email_exists|already been registered|already registered/i.test(detail)) {
      results.push({ email: user.email, status: 'ya existía' })
      continue
    }
    throw new Error(`No se pudo crear ${user.email}: la base respondió ${response.status}.`)
  }
  return results
}
