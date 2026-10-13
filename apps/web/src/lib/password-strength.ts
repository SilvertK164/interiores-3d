/** Largo mínimo de la contraseña al crear la cuenta (el de Supabase en este proyecto). */
export const PASSWORD_MIN = 6

export type PasswordStrength =
  | { level: 0; label: '' }
  | { level: 1; label: 'Débil' }
  | { level: 2; label: 'Aceptable' }
  | { level: 3; label: 'Buena' }

const NONE: PasswordStrength = { level: 0, label: '' }
const WEAK: PasswordStrength = { level: 1, label: 'Débil' }
const FAIR: PasswordStrength = { level: 2, label: 'Aceptable' }
const GOOD: PasswordStrength = { level: 3, label: 'Buena' }

// Claves que están en todas las listas de contraseñas filtradas: Débil por largas que parezcan.
const COMMON = new Set([
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '000000',
  '123123',
  'abc123',
  'qwerty',
  'qwerty123',
  'password',
  'password1',
  'contraseña',
  'contrasena',
  'iloveyou',
  'admin',
  'letmein',
  'welcome',
])

/** Cuántas clases de caracteres usa: minúsculas, mayúsculas, números y símbolos (el espacio cuenta como símbolo). */
function characterClasses(password: string): number {
  const tests = [/\p{Ll}/u, /\p{Lu}/u, /\p{N}/u, /[^\p{L}\p{N}]/u]
  return tests.filter((re) => re.test(password)).length
}

/**
 * Fuerza de la contraseña en tres niveles, para el medidor del registro (siempre con texto además del color):
 * Débil (menos de 6, común, o casi todo el mismo carácter), Aceptable (8 o más, o 6 con dos clases) y
 * Buena (10 o más con tres clases, o una frase de 14 o más). Es una guía rápida, no una garantía.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return NONE
  const chars = [...password]
  if (chars.length < PASSWORD_MIN || COMMON.has(password.toLowerCase()) || new Set(chars).size <= 2) return WEAK
  const classes = characterClasses(password)
  if (chars.length >= 14 || (chars.length >= 10 && classes >= 3)) return GOOD
  if (chars.length >= 8 || classes >= 2) return FAIR
  return WEAK
}
