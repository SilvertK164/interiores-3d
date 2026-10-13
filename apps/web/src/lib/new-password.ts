import type { AuthChangeEvent } from '@supabase/supabase-js'

/** Largo mínimo de la contraseña nueva (más exigente que el de Supabase, que es 6: aquí se pide al cambiarla). */
export const NEW_PASSWORD_MIN = 8

export type NewPasswordField = 'password' | 'repeat'
export type NewPasswordErrors = Partial<Record<NewPasswordField, string>>

/**
 * Valida las dos contraseñas de /nueva-contrasena. Los mensajes dicen qué falta y nunca repiten lo escrito.
 * `first` es el primer campo inválido, en el orden de la pantalla (recibe el foco).
 */
export function validateNewPassword(password: string, repeat: string): { errors: NewPasswordErrors; first: NewPasswordField | null } {
  const errors: NewPasswordErrors = {}
  if (password.length === 0) errors.password = 'Elige una contraseña nueva.'
  else if ([...password].length < NEW_PASSWORD_MIN) errors.password = `La contraseña es muy corta: usa ${NEW_PASSWORD_MIN} caracteres o más.`
  if (repeat.length === 0) errors.repeat = 'Repite la contraseña nueva.'
  else if (repeat !== password) errors.repeat = 'Las contraseñas no coinciden.'
  const first = errors.password ? 'password' : errors.repeat ? 'repeat' : null
  return { errors, first }
}

/** `checking`: aún se lee el enlace; `ready`: hay sesión de recuperación; `expired`: no hay (venció, ya se usó o no hubo enlace). */
export type RecoveryState = 'checking' | 'ready' | 'expired'

/**
 * Siguiente estado de la recuperación. `source` es el evento de `onAuthStateChange` o `GET_SESSION` (la lectura inicial
 * de `getSession()`, que ya espera a que Supabase procese el enlace de la URL). Una sesión deja crear la contraseña;
 * `INITIAL_SESSION` sin sesión no decide nada (puede llegar antes de procesar el enlace) y cerrar sesión lo vence.
 */
export function nextRecoveryState(current: RecoveryState, source: AuthChangeEvent | 'GET_SESSION', hasSession: boolean): RecoveryState {
  if (source === 'SIGNED_OUT') return 'expired'
  if (source === 'PASSWORD_RECOVERY' || hasSession) return 'ready'
  if (source === 'GET_SESSION') return current === 'ready' ? 'ready' : 'expired'
  return current
}
