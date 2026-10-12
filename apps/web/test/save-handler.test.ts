import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSaveHandler } from '../src/editor/save-handler'
import { type SaveOutcome, createSceneSaver } from '../src/editor/scene-saver'

type Graph = { width: number }

function setup(put?: (payload: Graph) => Promise<SaveOutcome>) {
  const sent: Graph[] = []
  const saver = createSceneSaver<Graph>({
    initialVersion: 1,
    debounceMs: 2000,
    put: put ?? (async (payload) => (sent.push(payload), { kind: 'ok', version: sent.length + 1 })),
  })
  return { sent, saver, handler: createSaveHandler(() => saver) }
}

describe('createSaveHandler (el onSave que `<Editor>` de Pascal llama tras 1 s sin cambios)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('devuelve enseguida: Pascal no queda "guardando" durante la espera ni el PUT, así que no aplaza (ni da por guardados) los cambios que lleguen en medio', async () => {
    const { handler, saver, sent } = setup()
    let returned = false
    void handler({ width: 0.9 } as never).then(() => {
      returned = true
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(returned).toBe(true)
    expect(saver.status).toBe('pending')
    expect(sent).toEqual([])
  })

  it('un cambio que llega mientras espera el guardado reemplaza al anterior: se envía solo lo último', async () => {
    const { handler, sent } = setup()
    await handler({ width: 0.9 } as never)
    await vi.advanceTimersByTimeAsync(1000)
    await handler({ width: 1 } as never)
    await vi.advanceTimersByTimeAsync(2500)
    expect(sent).toEqual([{ width: 1 }])
  })

  it('con el guardado en pausa (conflicto, sesión vencida) rechaza, para que Pascal no dé por guardado lo que no se guardó', async () => {
    const { handler } = setup(async () => ({ kind: 'conflict' }))
    await handler({ width: 0.9 } as never)
    await vi.advanceTimersByTimeAsync(2500)
    await expect(handler({ width: 1 } as never)).rejects.toThrow('versión más nueva')
  })

  it('con keepalive (la página se cierra) envía ya, con la escena recibida', async () => {
    const { handler, sent } = setup()
    await handler({ width: 1 } as never, { keepalive: true })
    expect(sent).toEqual([{ width: 1 }])
  })

  it('sin guardador todavía no hace nada', async () => {
    await expect(createSaveHandler(() => null)({ width: 1 } as never)).resolves.toBeUndefined()
  })
})
