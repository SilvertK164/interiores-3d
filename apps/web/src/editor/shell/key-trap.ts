import { keyFamilies, shouldTrap } from './key-guard'

type KeyListener = (event: KeyboardEvent) => void
export type KeyTrapTarget = {
  addEventListener(type: 'keydown', listener: KeyListener, capture: boolean): void
  removeEventListener(type: 'keydown', listener: KeyListener, capture: boolean): void
}
export type TrapState = { mode: 'ver' | 'editar'; walking: boolean }
type ElementLike = { tagName?: string; isContentEditable?: boolean; closest?: (selector: string) => unknown }

/**
 * Corta el camino de las teclas globales de Pascal cuando el foco está en el shell, y el de todas las que modifican la escena
 * en Ver. Un solo oyente en captura sobre `window`: llega antes que los de Pascal (burbuja en `window`, `document`) y solo
 * llama a `stopPropagation()`; nunca cancela la tecla, así Espacio sigue activando el botón y las letras buscan en las listas.
 */
export function installKeyTrap(options: { state: () => TrapState; target?: KeyTrapTarget }): () => void {
  const target: KeyTrapTarget = options.target ?? window
  const listener: KeyListener = (event) => {
    const el = event.target as ElementLike | null
    const editable = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable === true
    const inShell = Boolean(el?.closest?.('[data-editor-shell]'))
    const { mode, walking } = options.state()
    if (keyFamilies(event).some((family) => shouldTrap(family, { mode, walking, inShell, editable }))) {
      event.stopPropagation()
    }
  }
  target.addEventListener('keydown', listener, true)
  return () => target.removeEventListener('keydown', listener, true)
}
