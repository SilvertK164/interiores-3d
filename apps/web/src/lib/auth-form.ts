import { PASSWORD_MIN } from './password-strength'
import { NAME_MAX, NAME_MIN, normalizeName } from './person-name'

/** Las dos pestañas de /login: "Ingresar" y "Crear cuenta". */
export type AuthMode = 'login' | 'register'
export type AuthField = 'name' | 'email' | 'password'
export type AuthValues = Record<AuthField, string>
export type AuthErrors = Partial<Record<AuthField, string>>

export const MODES: readonly AuthMode[] = ['login', 'register']

/** Campos de cada formulario, en el orden en que aparecen (el primero inválido recibe el foco). */
export const FIELDS: Record<AuthMode, readonly AuthField[]> = {
  login: ['email', 'password'],
  register: ['name', 'email', 'password'],
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Mensaje de un campo, o `null` si está bien. Los mensajes dicen qué falta, no qué regla se rompió. */
export function validateField(mode: AuthMode, field: AuthField, value: string): string | null {
  if (field === 'name') {
    const length = [...normalizeName(value)].length
    if (length === 0) return 'Escribe cómo te llamamos.'
    if (length < NAME_MIN) return `Tu nombre necesita al menos ${NAME_MIN} caracteres.`
    return length > NAME_MAX ? `Usa ${NAME_MAX} caracteres o menos.` : null
  }
  if (field === 'email') {
    const email = value.trim()
    if (email.length === 0) return 'Escribe tu correo.'
    return EMAIL_FORMAT.test(email) ? null : 'Revisa el correo: debe verse como nombre@correo.com.'
  }
  // Al ingresar solo importa que no esté vacía: el largo lo decidió la cuenta cuando se creó.
  if (mode === 'login') return value.length === 0 ? 'Escribe tu contraseña.' : null
  if (value.length === 0) return 'Elige una contraseña.'
  return [...value].length < PASSWORD_MIN ? `La contraseña es muy corta: usa ${PASSWORD_MIN} caracteres o más.` : null
}

/** Todos los errores del formulario y el primer campo inválido (en el orden de la pantalla). */
export function validateAuthForm(mode: AuthMode, values: AuthValues): { errors: AuthErrors; first: AuthField | null } {
  const errors: AuthErrors = {}
  let first: AuthField | null = null
  for (const field of FIELDS[mode]) {
    const message = validateField(mode, field, values[field])
    if (!message) continue
    errors[field] = message
    first ??= field
  }
  return { errors, first }
}

/**
 * Errores que ya se pueden mostrar: los de los campos de los que la persona salió y, tras enviar, todos.
 * Se recalculan con cada tecla, así que el error desaparece en cuanto se corrige.
 */
export function visibleErrors(
  mode: AuthMode,
  values: AuthValues,
  seen: { touched: Partial<Record<AuthField, boolean>>; submitted: boolean },
): AuthErrors {
  const { errors } = validateAuthForm(mode, values)
  const shown: AuthErrors = {}
  for (const field of FIELDS[mode]) {
    const message = errors[field]
    if (message && (seen.submitted || seen.touched[field])) shown[field] = message
  }
  return shown
}

/** Pestaña a la que lleva una tecla estando en `current` (flechas dan la vuelta; Inicio y Fin van a los extremos). */
export function tabForKey(current: AuthMode, key: string): AuthMode | null {
  const index = MODES.indexOf(current)
  if (key === 'ArrowRight') return MODES[(index + 1) % MODES.length] ?? null
  if (key === 'ArrowLeft') return MODES[(index - 1 + MODES.length) % MODES.length] ?? null
  if (key === 'Home') return MODES[0] ?? null
  if (key === 'End') return MODES[MODES.length - 1] ?? null
  return null
}
