import type { AuthField, AuthMode } from './auth-form'

/** Qué se estaba haciendo cuando falló Supabase Auth: las dos pestañas de /login y la recuperación de la contraseña. */
export type AuthContext = AuthMode | 'reset' | 'new-password'

/** Botón que resuelve el problema que explica el aviso ("Ingresar con esa cuenta" cambia a la pestaña Ingresar). */
export type AuthAction = { kind: 'go-login'; label: string }

/** Mensaje del acceso: un error (con el campo al que llevar el foco y, a veces, una acción) o un aviso informativo. */
export type AuthNotice = { tone: 'error' | 'info'; message: string; field?: AuthField; action?: AuthAction }

const NETWORK = 'No hay conexión con el servidor. Reintenta en unos segundos.'
const RATE_LIMIT = 'Hiciste muchos intentos seguidos. Espera unos minutos e inténtalo de nuevo.'
// Al ingresar es SIEMPRE este mensaje: nunca se dice si el correo existe o no.
const CREDENTIALS = 'El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.'
const NOT_CONFIRMED = 'Todavía no confirmaste tu correo. Abre el mensaje que te enviamos y vuelve a ingresar.'
const LOGIN_FAILED = 'No pudimos ingresar. Inténtalo de nuevo en unos segundos.'
const EXISTS = 'Ya existe una cuenta con ese correo.'
const SIGNUP_CLOSED = 'Por ahora no se pueden crear cuentas nuevas.'
const EMAIL_INVALID = 'Ese correo no parece válido. Revisa que esté bien escrito o prueba con otro.'
const REGISTER_FAILED = 'No pudimos crear tu cuenta. Inténtalo de nuevo en unos segundos.'
const RESET_RATE_LIMIT = 'Pediste varios enlaces seguidos. Espera unos minutos antes de pedir otro.'
const RESET_FAILED = 'No pudimos enviar el enlace. Inténtalo de nuevo en unos segundos.'
const SAME_PASSWORD = 'Esa es tu contraseña actual. Elige una distinta.'
const RECOVERY_EXPIRED = 'El enlace venció o ya se usó. Pide uno nuevo desde «¿Olvidaste tu contraseña?» al ingresar.'
const NEW_PASSWORD_FAILED = 'No pudimos guardar tu contraseña nueva. Inténtalo de nuevo en unos segundos.'

/** Avisos que no son errores: los muestra /login según cómo se llegó o qué respondió el registro. */
export const CONFIRM_EMAIL_NOTICE: AuthNotice = {
  tone: 'info',
  message: 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a ingresar.',
}
// Se muestra SIEMPRE tras pedir el enlace, exista o no el correo: nunca se dice si la cuenta existe.
export const RESET_SENT_NOTICE: AuthNotice = {
  tone: 'info',
  message: 'Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también el correo no deseado.',
}
export const SESSION_EXPIRED_NOTICE: AuthNotice = {
  tone: 'info',
  message: 'Tu sesión venció. Vuelve a ingresar y seguimos donde lo dejaste.',
}

const error = (message: string, extra: Pick<AuthNotice, 'field' | 'action'> = {}): AuthNotice => ({ tone: 'error', message, ...extra })

type ErrorShape = { code?: unknown; status?: unknown; name?: unknown; message?: unknown; reasons?: unknown }

/** Sin respuesta del servidor: sin red (estado 0), servidor caído o tiempo agotado. */
function isUnreachable(name: unknown, code: string, status: number | undefined): boolean {
  return name === 'AuthRetryableFetchError' || status === 0 || (status !== undefined && status >= 500) || code === 'request_timeout' || code === 'unexpected_failure'
}

// Códigos que, al ingresar, se muestran como "no coinciden": los que delatarían si el correo existe se esconden aquí.
const CREDENTIAL_CODES = new Set(['invalid_credentials', 'user_not_found', 'user_already_exists', 'email_exists'])

function weakPasswordMessage(reasons: unknown): string {
  const list = Array.isArray(reasons) ? reasons : []
  if (list.includes('pwned')) return 'Esa contraseña aparece en filtraciones de datos. Elige otra.'
  if (list.includes('length')) return 'La contraseña es muy corta. Usa más caracteres.'
  if (list.includes('characters')) return 'La contraseña es muy simple. Mezcla mayúsculas, minúsculas, números y símbolos.'
  return 'La contraseña es muy débil. Usa más caracteres y mezcla letras, números y símbolos.'
}

function describeLogin(code: string, message: string): AuthNotice {
  if (code === 'email_not_confirmed') return error(NOT_CONFIRMED) // solo llega con la contraseña correcta: no delata nada
  if (CREDENTIAL_CODES.has(code) || /invalid login credentials/i.test(message)) return error(CREDENTIALS, { field: 'password' })
  return error(LOGIN_FAILED)
}

function describeRegister(code: string, reasons: unknown): AuthNotice {
  switch (code) {
    case 'user_already_exists':
    case 'email_exists':
      return error(EXISTS, { field: 'email', action: { kind: 'go-login', label: 'Ingresar con esa cuenta' } })
    case 'weak_password':
      return error(weakPasswordMessage(reasons), { field: 'password' })
    case 'signup_disabled':
    case 'email_provider_disabled':
      return error(SIGNUP_CLOSED)
    case 'email_address_invalid':
      return error(EMAIL_INVALID, { field: 'email' })
    default:
      return error(REGISTER_FAILED)
  }
}

// Sin sesión de recuperación (el enlace ya se usó o venció), Supabase responde 401/403 con alguno de estos códigos.
const RECOVERY_EXPIRED_CODES = new Set(['session_not_found', 'session_expired', 'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt', 'no_authorization', 'not_authenticated', 'reauthentication_needed'])

function describeReset(code: string): AuthNotice {
  // Un correo "no encontrado" se trata como enviado: aquí nunca se revela si existe.
  if (code === 'user_not_found' || code === 'email_not_found') return RESET_SENT_NOTICE
  if (code === 'email_address_invalid') return error(EMAIL_INVALID, { field: 'email' })
  return error(RESET_FAILED)
}

function describeNewPassword(code: string, status: number | undefined, reasons: unknown): AuthNotice {
  if (code === 'weak_password') return error(weakPasswordMessage(reasons), { field: 'password' })
  if (code === 'same_password') return error(SAME_PASSWORD, { field: 'password' })
  if (RECOVERY_EXPIRED_CODES.has(code) || status === 401 || status === 403) {
    return error(RECOVERY_EXPIRED, { action: { kind: 'go-login', label: 'Volver a ingresar' } })
  }
  return error(NEW_PASSWORD_FAILED)
}

/**
 * ÚNICA capa que traduce los errores de Supabase Auth a castellano llano (la de la API propia es `api/errors.ts`).
 * Mira el `code`, y el `status` o el nombre cuando no hay código (red caída, límite de pedidos). Nunca devuelve el
 * texto del servidor, que está en inglés y es técnico. Acepta cualquier valor: lo desconocido no lanza.
 */
export function describeAuthError(err: unknown, context: AuthContext): AuthNotice {
  const e: ErrorShape = typeof err === 'object' && err !== null ? (err as ErrorShape) : {}
  const code = typeof e.code === 'string' ? e.code : ''
  const status = typeof e.status === 'number' ? e.status : undefined
  if (isUnreachable(e.name, code, status)) return error(NETWORK)
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429) return error(context === 'reset' ? RESET_RATE_LIMIT : RATE_LIMIT)
  if (context === 'reset') return describeReset(code)
  if (context === 'new-password') return describeNewPassword(code, status, e.reasons)
  return context === 'login' ? describeLogin(code, typeof e.message === 'string' ? e.message : '') : describeRegister(code, e.reasons)
}
