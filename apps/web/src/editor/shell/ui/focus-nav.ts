import type { KeyboardEvent } from 'react'

export type Orientation = 'horizontal' | 'vertical'

/** A qué posición va el foco con esa tecla: la flecha del eje avanza o retrocede dando la vuelta, Inicio y Fin van a los extremos; `null` si no la usa. */
export function nextIndex(key: string, at: number, count: number, orientation: Orientation): number | null {
  const back = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
  const forward = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === forward) return (at + 1) % count
  if (key === back) return (at - 1 + count) % count
  return null
}

/**
 * Mueve el foco entre los elementos de `event.currentTarget` que cumplen `selector`, solo si la tecla viene de uno de ellos (así un
 * menú abierto dentro de la barra no la mueve). Cancela la tecla para que la página no se desplace y devuelve si la usó.
 */
export function moveFocusOnKey(event: KeyboardEvent<HTMLElement>, selector: string, orientation: Orientation): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(selector)]
  const at = items.indexOf(event.target as HTMLElement)
  if (at < 0) return false
  const to = nextIndex(event.key, at, items.length, orientation)
  if (to === null) return false
  event.preventDefault()
  items[to]?.focus()
  return true
}
