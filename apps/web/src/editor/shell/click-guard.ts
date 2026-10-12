/**
 * Frena el segundo clic de un doble clic: `true` = la acción puede correr; una nueva llamada dentro de `windowMs` desde la
 * última permitida devuelve `false`. Sirve para "Agregar planta" y "Duplicar", que crean cosas.
 */
export function createClickGuard(windowMs = 600): () => boolean {
  let last = Number.NEGATIVE_INFINITY
  return () => {
    const now = Date.now()
    if (now - last < windowMs) return false
    last = now
    return true
  }
}
