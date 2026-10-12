import { describe, expect, it, vi } from 'vitest'
import { installKeyTrap } from '../src/editor/shell/key-trap'

type Handler = (event: never) => void
/** Un `window` de mentira: guarda el oyente y el modo de captura con que se registró. */
function fakeWindow() {
  const listeners: { type: string; handler: Handler; capture: boolean }[] = []
  return {
    listeners,
    addEventListener: (type: string, handler: Handler, capture: boolean) => void listeners.push({ type, handler, capture }),
    removeEventListener: (type: string, handler: Handler) => {
      const at = listeners.findIndex((l) => l.type === type && l.handler === handler)
      if (at >= 0) listeners.splice(at, 1)
    },
  }
}
const element = (tagName: string, inShell: boolean, isContentEditable = false) => ({
  tagName,
  isContentEditable,
  closest: (selector: string) => (inShell && selector === '[data-editor-shell]' ? {} : null),
})
const keydown = (key: string, target: unknown, extra: Record<string, unknown> = {}) => ({
  key,
  code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key,
  ctrlKey: false,
  metaKey: false,
  target,
  stopPropagation: vi.fn(),
  preventDefault: vi.fn(),
  ...extra,
})

describe('installKeyTrap', () => {
  const setup = (mode: 'ver' | 'editar', walking = false) => {
    const win = fakeWindow()
    const stop = installKeyTrap({ state: () => ({ mode, walking }), target: win })
    const send = win.listeners[0]?.handler as unknown as (event: unknown) => void
    return { win, stop, send }
  }

  it('registra un solo oyente de keydown en fase de captura y se quita al desmontar', () => {
    const { win, stop } = setup('editar')
    expect(win.listeners).toHaveLength(1)
    expect(win.listeners[0]).toMatchObject({ type: 'keydown', capture: true })
    stop()
    expect(win.listeners).toHaveLength(0)
  })

  it('Supr con el foco en un botón del shell no llega a Pascal, pero la tecla no se cancela (Espacio sigue activando el botón)', () => {
    const { send } = setup('editar')
    const delKey = keydown('Delete', element('BUTTON', true))
    send(delKey)
    expect(delKey.stopPropagation).toHaveBeenCalledTimes(1)
    expect(delKey.preventDefault).not.toHaveBeenCalled()
  })

  it('con el foco en un campo del shell, o en el lienzo, Pascal recibe la tecla como siempre', () => {
    const { send } = setup('editar')
    for (const target of [element('INPUT', true), element('TEXTAREA', true), element('DIV', true, true), element('CANVAS', false)]) {
      const event = keydown('Delete', target)
      send(event)
      expect(event.stopPropagation, target.tagName).not.toHaveBeenCalled()
    }
  })

  it('en Ver Ctrl+Z no llega a Pascal ni desde el lienzo; en Editar con el foco en el lienzo sí', () => {
    const view = setup('ver')
    const undoInView = keydown('z', element('CANVAS', false), { ctrlKey: true })
    view.send(undoInView)
    expect(undoInView.stopPropagation).toHaveBeenCalledTimes(1)
    const edit = setup('editar')
    const undoInEdit = keydown('z', element('CANVAS', false), { ctrlKey: true })
    edit.send(undoInEdit)
    expect(undoInEdit.stopPropagation).not.toHaveBeenCalled()
  })

  it('Escape y Tab nunca se frenan', () => {
    const { send } = setup('ver')
    for (const key of ['Escape', 'Tab']) {
      const event = keydown(key, element('BUTTON', true))
      send(event)
      expect(event.stopPropagation, key).not.toHaveBeenCalled()
    }
  })

  it('durante el recorrido, E, R, T y P llegan al recorrido de Pascal', () => {
    const { send } = setup('ver', true)
    for (const key of ['e', 'r', 't', 'p']) {
      const event = keydown(key, element('CANVAS', false))
      send(event)
      expect(event.stopPropagation, key).not.toHaveBeenCalled()
    }
  })
})
