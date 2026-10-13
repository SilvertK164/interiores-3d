import { describe, expect, it } from 'vitest'
import { abortable } from '../src/lib/export/abortable'

const never = () => new Promise<never>(() => {})
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('abortable (cancelar la exportación responde ya, aunque Pascal tarde en enterarse)', () => {
  it('devuelve el resultado si nadie cancela', async () => {
    const controller = new AbortController()
    await expect(abortable(Promise.resolve(42), controller.signal)).resolves.toBe(42)
  })

  it('rechaza con AbortError en cuanto se cancela, aunque el trabajo siga pendiente', async () => {
    const controller = new AbortController()
    const waiting = abortable(never(), controller.signal)
    controller.abort()
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('si ya estaba cancelada, rechaza de inmediato y el rechazo del trabajo no queda sin atender', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(abortable(Promise.reject(new Error('tarde')), controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    await tick()
  })

  it('un error del trabajo después de cancelar se descarta (no hay rechazos sin atender)', async () => {
    const controller = new AbortController()
    let fail: (error: Error) => void = () => {}
    const work = new Promise<never>((_, reject) => {
      fail = reject
    })
    const waiting = abortable(work, controller.signal)
    controller.abort()
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
    fail(new Error('Pascal terminó con un error'))
    await tick()
  })

  it('si el trabajo falla antes de cancelar, el error es el suyo', async () => {
    const controller = new AbortController()
    await expect(abortable(Promise.reject(new Error('sin memoria')), controller.signal)).rejects.toThrow('sin memoria')
  })
})
