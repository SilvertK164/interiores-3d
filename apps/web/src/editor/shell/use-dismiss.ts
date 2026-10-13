import { type RefObject, useEffect } from 'react'

/** Cierra algo flotante (un menú, una lista) con un clic fuera del elemento de `ref`. */
export function useDismiss(active: boolean, ref: RefObject<HTMLElement | null>, onDismiss: () => void) {
  useEffect(() => {
    if (!active) return
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onDismiss()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active, ref, onDismiss])
}
