/** Igualdad por valor de datos simples (primitivos, listas y objetos): estabiliza lo que devuelven los selectores. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keysA = Object.keys(a)
  if (keysA.length !== Object.keys(b).length) return false
  return keysA.every(
    (key) => key in b && deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}
