import type { AuthMode } from './auth-form'
import { parseNext } from './safe-next'

/** Por qué se llegó a /login: hoy solo "la sesión venció". */
export type LoginReason = 'sesion'

type Query = Record<string, string | string[] | undefined>

/** Si el parámetro se repite, vale el primero. */
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * Lee la URL de /login: `?modo=crear` abre la pestaña de registro, `?motivo=sesion` muestra el aviso de sesión
 * vencida y `?next=<ruta>` es a dónde volver. `next` se devuelve tal cual; quien navega lo pasa por `safeNext`.
 */
export function parseLoginParams(query: Query): { mode: AuthMode; reason: LoginReason | null; next: string | null } {
  return {
    mode: first(query.modo) === 'crear' ? 'register' : 'login',
    reason: first(query.motivo) === 'sesion' ? 'sesion' : null,
    next: typeof query.next === 'string' && query.next.length > 0 ? query.next : null,
  }
}

/**
 * Dirección de /login para mandar a alguien a ingresar: `/login?motivo=sesion&next=<ruta actual>`.
 * Un destino que no es una ruta interna se descarta. Nunca lleva correo ni contraseña.
 */
export function loginHref({ next, reason }: { next?: string | null; reason?: LoginReason | null } = {}): string {
  const params = new URLSearchParams()
  if (reason) params.set('motivo', reason)
  const target = parseNext(next)
  if (target) params.set('next', target)
  const query = params.toString()
  return query ? `/login?${query}` : '/login'
}
