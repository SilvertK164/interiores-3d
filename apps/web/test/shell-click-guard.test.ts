import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClickGuard } from '../src/editor/shell/click-guard'

afterEach(() => vi.useRealTimers())

describe('createClickGuard', () => {
  it('deja pasar el primer clic y frena el segundo dentro de la ventana (doble clic)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const allow = createClickGuard(600)
    expect(allow()).toBe(true)
    vi.setSystemTime(1_200)
    expect(allow()).toBe(false)
  })

  it('vuelve a dejar pasar cuando la ventana terminó, y la ventana cuenta desde el último permitido', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const allow = createClickGuard(600)
    expect(allow()).toBe(true)
    vi.setSystemTime(1_599)
    expect(allow()).toBe(false)
    vi.setSystemTime(1_600)
    expect(allow()).toBe(true)
  })
})
