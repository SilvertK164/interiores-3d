'use client'

import { useEffect, useRef, useState } from 'react'
import type { PlanBuildArgs, PlanResult } from '@/lib/export/types'

export type PreviewState = { status: 'idle' | 'loading' | 'ready' | 'unavailable'; blob: Blob | null }

/** Lo que cambia la hoja de la vista previa (no el progreso, la señal ni la fecha): sirve de dependencia del efecto. */
export function previewKey(args: PlanBuildArgs): string {
  return JSON.stringify([args.paper, args.orientation, args.scale, args.mode, args.titleBlock, args.levelIds, args.isoPreview ?? false, args.sheetNumbers ?? null, args.projectName, args.author])
}

type Runner = {
  request(args: PlanBuildArgs): void
  clear(): void
  dispose(): void
}

/**
 * Arma la hoja de la vista previa con una espera tras el último cambio, **de a una por vez** (Pascal monta un plano oculto por
 * cada una) y descartando lo que llega después de un pedido más nuevo. Mientras carga conserva la imagen anterior.
 */
export function createPreviewRunner(options: { build(args: PlanBuildArgs): Promise<PlanResult>; delayMs: number; onState(state: PreviewState): void }): Runner {
  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null
  let latest = 0
  let last: Blob | null = null
  let chain: Promise<void> = Promise.resolve()

  const run = async (id: number, args: PlanBuildArgs) => {
    if (id !== latest) return
    const mine = new AbortController()
    controller = mine
    try {
      const result = await options.build({ ...args, signal: mine.signal })
      if (id !== latest) return
      last = result.blob
      options.onState({ status: 'ready', blob: result.blob })
    } catch {
      if (id !== latest || mine.signal.aborted) return
      options.onState({ status: 'unavailable', blob: null })
    }
  }

  const stopTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return {
    request(args) {
      stopTimer()
      controller?.abort()
      latest += 1
      const id = latest
      options.onState({ status: 'loading', blob: last })
      timer = setTimeout(() => {
        timer = null
        chain = chain.then(() => run(id, args))
      }, options.delayMs)
    },
    clear() {
      stopTimer()
      controller?.abort()
      latest += 1
      last = null
      options.onState({ status: 'idle', blob: null })
    },
    dispose() {
      stopTimer()
      controller?.abort()
      latest += 1
    },
  }
}

const IDLE: PreviewState = { status: 'idle', blob: null }

/** La página de la vista previa para esas opciones (`null` = no hay nada que mostrar: se limpia). */
export function usePlanPreview(args: PlanBuildArgs | null, build: (args: PlanBuildArgs) => Promise<PlanResult>, delayMs: number): PreviewState {
  const [state, setState] = useState<PreviewState>(IDLE)
  const runner = useRef<Runner | null>(null)
  const buildRef = useRef(build)
  buildRef.current = build
  const latestArgs = useRef(args)
  latestArgs.current = args

  useEffect(() => {
    const created = createPreviewRunner({ build: (next) => buildRef.current(next), delayMs, onState: setState })
    runner.current = created
    return () => created.dispose()
  }, [delayMs])

  const key = args ? previewKey(args) : null
  useEffect(() => {
    const current = latestArgs.current
    if (key === null || !current) runner.current?.clear()
    else runner.current?.request(current)
  }, [key])

  return state
}
