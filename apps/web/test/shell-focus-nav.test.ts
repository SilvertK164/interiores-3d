import type { KeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { moveFocusOnKey, nextIndex } from '../src/editor/shell/ui/focus-nav'

describe('nextIndex', () => {
  it('la flecha del eje avanza y retrocede, y da la vuelta en los bordes', () => {
    expect(nextIndex('ArrowRight', 0, 3, 'horizontal')).toBe(1)
    expect(nextIndex('ArrowRight', 2, 3, 'horizontal')).toBe(0)
    expect(nextIndex('ArrowLeft', 0, 3, 'horizontal')).toBe(2)
    expect(nextIndex('ArrowLeft', 2, 3, 'horizontal')).toBe(1)
    expect(nextIndex('ArrowDown', 1, 3, 'vertical')).toBe(2)
    expect(nextIndex('ArrowUp', 0, 3, 'vertical')).toBe(2)
  })

  it('Inicio y Fin van al primero y al último, en cualquier eje', () => {
    expect(nextIndex('Home', 2, 4, 'horizontal')).toBe(0)
    expect(nextIndex('End', 0, 4, 'vertical')).toBe(3)
  })

  it('las flechas del otro eje y las demás teclas no mueven el foco', () => {
    expect(nextIndex('ArrowUp', 1, 3, 'horizontal')).toBeNull()
    expect(nextIndex('ArrowLeft', 1, 3, 'vertical')).toBeNull()
    for (const key of ['Tab', 'Enter', ' ', 'a', 'Escape']) expect(nextIndex(key, 1, 3, 'horizontal'), key).toBeNull()
  })

  it('con un solo elemento da la vuelta sobre sí mismo', () => {
    expect(nextIndex('ArrowRight', 0, 1, 'horizontal')).toBe(0)
    expect(nextIndex('ArrowLeft', 0, 1, 'horizontal')).toBe(0)
  })
})

describe('moveFocusOnKey', () => {
  const buttons = () => [{ focus: vi.fn() }, { focus: vi.fn() }, { focus: vi.fn() }]
  const send = (key: string, items: ReturnType<typeof buttons>, from: unknown, extra: Record<string, unknown> = {}) => {
    const event = {
      key,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      target: from,
      currentTarget: { querySelectorAll: () => items },
      preventDefault: vi.fn(),
      ...extra,
    }
    return { event, moved: moveFocusOnKey(event as unknown as KeyboardEvent<HTMLElement>, '[data-dock]', 'horizontal') }
  }

  it('enfoca el vecino, cancela la tecla (la página no se desplaza) y avisa que la usó', () => {
    const items = buttons()
    const { event, moved } = send('ArrowRight', items, items[0])
    expect(moved).toBe(true)
    expect(items[1]?.focus).toHaveBeenCalledTimes(1)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('Fin y Inicio saltan a los extremos', () => {
    const items = buttons()
    send('End', items, items[0])
    expect(items[2]?.focus).toHaveBeenCalledTimes(1)
    send('Home', items, items[2])
    expect(items[0]?.focus).toHaveBeenCalledTimes(1)
  })

  it('con Ctrl, Cmd o Alt no hace nada: son atajos del navegador', () => {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      const items = buttons()
      const { event, moved } = send('ArrowRight', items, items[0], { [modifier]: true })
      expect(moved, modifier).toBe(false)
      expect(event.preventDefault, modifier).not.toHaveBeenCalled()
      for (const item of items) expect(item.focus, modifier).not.toHaveBeenCalled()
    }
  })

  it('si la tecla no viene de uno de los elementos (un menú abierto dentro de la barra) no hace nada', () => {
    const items = buttons()
    const { event, moved } = send('ArrowRight', items, { tagName: 'BUTTON', role: 'menuitem' })
    expect(moved).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    for (const item of items) expect(item.focus).not.toHaveBeenCalled()
  })

  it('una tecla que no mueve el foco no se cancela', () => {
    const items = buttons()
    const { event, moved } = send('Enter', items, items[1])
    expect(moved).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
