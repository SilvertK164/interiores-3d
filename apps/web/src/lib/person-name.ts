import { initialsFromEmail, initialsFromWords, lettersWords, nameFromEmail } from './ui-text'

/** Largo permitido del nombre al crear la cuenta, contado después de recortar los espacios. */
export const NAME_MIN = 2
export const NAME_MAX = 40

/** Lo mínimo que necesitamos de la cuenta; el registro guarda el nombre en `user_metadata.name`. */
export type AccountLike = { email?: string | null; user_metadata?: Record<string, unknown> | null } | null | undefined

/** El nombre como se guarda: sin espacios en los extremos y con un solo espacio entre palabras. */
export const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ')

/**
 * Nombre completo que la persona escribió al crear su cuenta; vacío en las cuentas anteriores o si el metadato no
 * es texto. Lo puede escribir la propia persona, así que se normaliza y se limita su largo (siempre se muestra como texto).
 */
export function savedName(user: AccountLike): string {
  const raw = user?.user_metadata?.name
  return typeof raw === 'string' ? [...normalizeName(raw)].slice(0, NAME_MAX).join('') : ''
}

/** Nombre para saludar: la primera palabra del nombre guardado, tal como se escribió, o, en las cuentas anteriores, el que sale del correo. */
export function greetingName(user: AccountLike): string {
  return savedName(user).split(' ')[0] || nameFromEmail(user?.email)
}

/** Iniciales del avatar: las del nombre guardado y, si no hay, las del correo. */
export function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  const words = lettersWords(name ?? '')
  return words.length > 0 ? initialsFromWords(words) : initialsFromEmail(email)
}
