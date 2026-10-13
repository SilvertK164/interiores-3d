import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canvasScale } from '../src/lib/export/preview-scale'
import { type PreviewState, createPreviewRunner, previewKey } from '../src/editor/shell/use-plan-preview'
import type { PlanBuildArgs, PlanResult } from '../src/lib/export/types'

const ARGS: PlanBuildArgs = {
  paper: 'A4',
  orientation: 'landscape',
  scale: 50,
  mode: 'paper',
  levelIds: ['a'],
  titleBlock: true,
  projectName: 'Casa',
  author: 'Ana',
  date: new Date(2026, 9, 12),
}
const result = (text: string): PlanResult => ({ blob: new Blob([text]), pages: 1, skippedImages: 0 })

describe('canvasScale', () => {
  it('lleva el ancho de la hoja en puntos al ancho del cuadro en píxeles reales', () => {
    expect(canvasScale(600, 841.89, 1)).toBeCloseTo(600 / 841.89, 9)
    expect(canvasScale(600, 841.89, 2)).toBeCloseTo(1200 / 841.89, 9)
  })

  it('limita la densidad de píxeles entre 1 y 2 y nunca da cero', () => {
    expect(canvasScale(600, 841.89, 3)).toBeCloseTo(1200 / 841.89, 9)
    expect(canvasScale(600, 841.89, 0.5)).toBeCloseTo(600 / 841.89, 9)
    expect(canvasScale(0, 841.89, 1)).toBe(0.1)
  })
})

describe('previewKey', () => {
  it('cambia con lo que cambia la hoja y no con lo que no la cambia (progreso, señal, fecha)', () => {
    const base = previewKey(ARGS)
    expect(previewKey({ ...ARGS, onProgress: () => {}, signal: new AbortController().signal, date: new Date(2030, 0, 1) })).toBe(base)
    for (const change of [{ scale: 100 as const }, { mode: 'color' as const }, { paper: 'A3' as const }, { titleBlock: false }, { levelIds: ['b'] }, { projectName: 'Otra' }, { sheetNumbers: { start: 1, total: 2 } }]) {
      expect(previewKey({ ...ARGS, ...change }), JSON.stringify(change)).not.toBe(base)
    }
  })
})

describe('createPreviewRunner (criterio 8: espera, una a la vez, sin resultados viejos)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  /** Deja correr las promesas pendientes (el ejecutor encadena varias). */
  const settle = async () => {
    for (let i = 0; i < 6; i++) await vi.advanceTimersByTimeAsync(0)
  }

  function setup(build: (args: PlanBuildArgs) => Promise<PlanResult>) {
    const states: PreviewState[] = []
    const runner = createPreviewRunner({ build, delayMs: 250, onState: (s) => states.push(s) })
    return { runner, states, last: () => states.at(-1) }
  }

  it('varios cambios seguidos arman una sola página, la del último', async () => {
    const build = vi.fn(async (args: PlanBuildArgs) => result(String(args.scale)))
    const { runner, last } = setup(build)
    runner.request({ ...ARGS, scale: 25 })
    runner.request({ ...ARGS, scale: 50 })
    runner.request({ ...ARGS, scale: 100 })
    expect(last()?.status).toBe('loading')
    await vi.advanceTimersByTimeAsync(249)
    expect(build).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await settle()
    expect(build).toHaveBeenCalledTimes(1)
    expect(build.mock.calls[0]?.[0].scale).toBe(100)
    expect(last()?.status).toBe('ready')
    expect(await last()?.blob?.text()).toBe('100')
  })

  it('mientras carga conserva la imagen anterior (sin parpadeo)', async () => {
    const { runner, last } = setup(async () => result('uno'))
    runner.request(ARGS)
    await vi.advanceTimersByTimeAsync(250)
    await settle()
    runner.request({ ...ARGS, scale: 100 })
    expect(last()).toMatchObject({ status: 'loading' })
    expect(await last()?.blob?.text()).toBe('uno')
  })

  it('un resultado viejo que llega tarde no pisa al nuevo, y nunca corren dos a la vez', async () => {
    const resolvers: ((value: PlanResult) => void)[] = []
    let running = 0
    let peak = 0
    const build = vi.fn(
      (_args: PlanBuildArgs) =>
        new Promise<PlanResult>((resolve) => {
          running += 1
          peak = Math.max(peak, running)
          resolvers.push((value) => {
            running -= 1
            resolve(value)
          })
        }),
    )
    const { runner, last } = setup(build)
    runner.request({ ...ARGS, scale: 25 })
    await vi.advanceTimersByTimeAsync(250)
    runner.request({ ...ARGS, scale: 100 })
    await vi.advanceTimersByTimeAsync(250)
    expect(build).toHaveBeenCalledTimes(1)
    resolvers[0]?.(result('viejo'))
    await settle()
    expect(build).toHaveBeenCalledTimes(2)
    expect(last()?.status).toBe('loading')
    resolvers[1]?.(result('nuevo'))
    await settle()
    expect(await last()?.blob?.text()).toBe('nuevo')
    expect(peak).toBe(1)
  })

  it('si armar falla, la vista previa queda "no disponible" (la descarga no depende de ella)', async () => {
    const { runner, last } = setup(async () => {
      throw new Error('se cayó')
    })
    runner.request(ARGS)
    await vi.advanceTimersByTimeAsync(250)
    await settle()
    expect(last()).toEqual({ status: 'unavailable', blob: null })
  })

  it('clear vuelve a "idle" y cancela lo pendiente; dispose no avisa más', async () => {
    const build = vi.fn(async () => result('x'))
    const { runner, states, last } = setup(build)
    runner.request(ARGS)
    runner.clear()
    await vi.advanceTimersByTimeAsync(500)
    expect(build).not.toHaveBeenCalled()
    expect(last()).toEqual({ status: 'idle', blob: null })
    runner.request(ARGS)
    const count = states.length
    runner.dispose()
    await vi.advanceTimersByTimeAsync(500)
    expect(states).toHaveLength(count)
    expect(build).not.toHaveBeenCalled()
  })

  it('pasa una señal de cancelación al armar y la cancela con el siguiente pedido', async () => {
    const signals: AbortSignal[] = []
    const { runner } = setup(
      (args) =>
        new Promise<PlanResult>((resolve) => {
          if (args.signal) signals.push(args.signal)
          setTimeout(() => resolve(result('x')), 1000)
        }),
    )
    runner.request(ARGS)
    await vi.advanceTimersByTimeAsync(250)
    runner.request({ ...ARGS, scale: 100 })
    expect(signals[0]?.aborted).toBe(true)
  })
})
