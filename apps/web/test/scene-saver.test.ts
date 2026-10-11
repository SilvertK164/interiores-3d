import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type SaveOutcome, type SaverStatus, createSceneSaver } from '../src/editor/scene-saver.js'

type Payload = { n: number }
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(outcomes: SaveOutcome[] | ((p: Payload, v: number) => Promise<SaveOutcome>), initialVersion = 1) {
  const calls: { payload: Payload; version: number }[] = []
  const statuses: SaverStatus[] = []
  let i = 0
  const put = async (payload: Payload, version: number): Promise<SaveOutcome> => {
    calls.push({ payload, version })
    if (typeof outcomes === 'function') return outcomes(payload, version)
    return outcomes[Math.min(i++, outcomes.length - 1)] as SaveOutcome
  }
  const saver = createSceneSaver<Payload>({
    put,
    initialVersion,
    debounceMs: 2000,
    retryDelaysMs: [2000, 5000],
    onStatus: (s) => statuses.push(s),
  })
  return { saver, calls, statuses }
}

describe('createSceneSaver', () => {
  it('junta guardados rápidos en uno solo con la última escena tras 2 s', async () => {
    const { saver, calls } = setup([{ kind: 'ok', version: 2 }])
    saver.save({ n: 1 })
    await vi.advanceTimersByTimeAsync(1500)
    saver.save({ n: 2 })
    await vi.advanceTimersByTimeAsync(1500)
    expect(calls).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(600)
    expect(calls).toEqual([{ payload: { n: 2 }, version: 1 }])
  })

  it('la promesa de save() se resuelve cuando se guardó', async () => {
    const { saver } = setup([{ kind: 'ok', version: 2 }])
    let done = false
    const p = saver.save({ n: 1 }).then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(1999)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(10)
    await p
    expect(done).toBe(true)
  })

  it('nunca hay dos guardados en vuelo: lo que se edita durante uno viaja después con la versión nueva', async () => {
    let release: (o: SaveOutcome) => void = () => {}
    const outcomes = [new Promise<SaveOutcome>((r) => { release = r }), Promise.resolve<SaveOutcome>({ kind: 'ok', version: 3 })]
    let k = 0
    const { saver, calls } = setup(async () => outcomes[k++] as Promise<SaveOutcome>)
    saver.save({ n: 1 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls).toHaveLength(1)
    saver.save({ n: 2 })
    await vi.advanceTimersByTimeAsync(2500)
    expect(calls).toHaveLength(1)
    release({ kind: 'ok', version: 2 })
    await vi.advanceTimersByTimeAsync(10)
    await vi.advanceTimersByTimeAsync(2500)
    expect(calls).toEqual([
      { payload: { n: 1 }, version: 1 },
      { payload: { n: 2 }, version: 2 },
    ])
  })

  it('un 409 detiene el autoguardado y conserva lo local', async () => {
    const { saver, calls, statuses } = setup([{ kind: 'conflict' }])
    saver.save({ n: 1 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(statuses.at(-1)).toBe('conflict')
    saver.save({ n: 2 })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls).toHaveLength(1)
    expect(saver.status).toBe('conflict')
  })

  it('un 401 (sesión vencida) detiene el autoguardado sin reintentar en bucle', async () => {
    const { saver, calls, statuses } = setup([{ kind: 'unauthorized' }])
    saver.save({ n: 1 })
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toHaveLength(1)
    expect(statuses.at(-1)).toBe('unauthorized')
  })

  it('reintenta con espera creciente tras un error y se recupera', async () => {
    const { saver, calls, statuses } = setup([
      { kind: 'error', message: 'sin red' },
      { kind: 'error', message: 'sin red' },
      { kind: 'ok', version: 2 },
    ])
    saver.save({ n: 1 }).catch(() => {})
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls).toHaveLength(1)
    expect(statuses.at(-1)).toBe('error')
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(5000)
    expect(calls).toHaveLength(3)
    expect(statuses.at(-1)).toBe('saved')
    expect(saver.version).toBe(2)
  })

  it('flushNow guarda de inmediato (por ejemplo al cerrar la pestaña)', async () => {
    const { saver, calls } = setup([{ kind: 'ok', version: 2 }])
    await saver.flushNow({ n: 7 })
    expect(calls).toEqual([{ payload: { n: 7 }, version: 1 }])
  })
})
