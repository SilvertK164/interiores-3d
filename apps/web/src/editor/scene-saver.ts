export type SaveOutcome =
  | { kind: 'ok'; version: number }
  | { kind: 'conflict' }
  | { kind: 'unauthorized' }
  | { kind: 'rejected'; message: string }
  | { kind: 'error'; message: string }

export type SaverStatus =
  | 'idle'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'conflict'
  | 'unauthorized'
  | 'rejected'
  | 'error'

export type SceneSaverDeps<T> = {
  put: (payload: T, expectedVersion: number, opts: { keepalive: boolean }) => Promise<SaveOutcome>
  initialVersion: number
  debounceMs?: number
  retryDelaysMs?: number[]
  onStatus?: (status: SaverStatus, detail?: string) => void
}

export type SceneSaver<T> = {
  save(payload: T): Promise<void>
  flushNow(payload?: T): Promise<void>
  /** Levanta la pausa por sesión vencida (tras volver a ingresar). Un conflicto exige recargar. */
  resume(): void
  readonly status: SaverStatus
  readonly version: number
}

type Pause = 'conflict' | 'unauthorized' | 'rejected'
type Waiter = { resolve: () => void; reject: (e: Error) => void }

const PAUSE_MESSAGE: Record<Pause, string> = {
  conflict: 'Hay una versión más nueva del proyecto en el servidor.',
  unauthorized: 'Tu sesión venció.',
  rejected: 'La escena no se puede guardar.',
}

/**
 * Autoguardado con debounce, un solo guardado en vuelo, reintentos y pausa ante 409/401/rechazos.
 * `save()` devuelve una promesa que se resuelve cuando la escena quedó guardada y se **rechaza** si el
 * guardador está en pausa, para que `<Editor>` no marque como guardado lo que no se guardó.
 */
export function createSceneSaver<T>(deps: SceneSaverDeps<T>): SceneSaver<T> {
  const debounceMs = deps.debounceMs ?? 2000
  const retryDelays = deps.retryDelaysMs ?? [2000, 5000, 15000]
  let version = deps.initialVersion
  let status: SaverStatus = 'idle'
  let latest: { payload: T } | null = null
  let dirty = false
  let inFlight = false
  let pause: Pause | null = null
  let pauseMessage = ''
  let followUp: { keepalive: boolean } | null = null
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let waiters: Waiter[] = []

  const setStatus = (s: SaverStatus, detail?: string) => {
    status = s
    deps.onStatus?.(s, detail)
  }
  const pausedError = () => new Error(pause === 'rejected' ? pauseMessage : PAUSE_MESSAGE[pause ?? 'rejected'])
  const settle = (error?: Error) => {
    const current = waiters
    waiters = []
    for (const w of current) error ? w.reject(error) : w.resolve()
  }
  const schedule = (ms: number) => {
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), ms)
  }

  async function flush(keepalive = false): Promise<void> {
    clearTimeout(timer)
    if (pause) return settle(pausedError())
    if (!dirty || !latest) return settle()
    if (inFlight) {
      followUp = { keepalive: keepalive || (followUp?.keepalive ?? false) }
      return
    }
    inFlight = true
    const sent = latest
    const sentWaiters = waiters
    waiters = []
    setStatus('saving')
    const outcome = await deps.put(sent.payload, version, { keepalive })
    inFlight = false
    if (outcome.kind === 'ok') {
      version = outcome.version
      attempt = 0
      if (latest === sent) dirty = false
      setStatus(dirty ? 'pending' : 'saved')
      for (const w of sentWaiters) w.resolve()
      const next = followUp
      followUp = null
      if (dirty) {
        if (next) void flush(next.keepalive)
        else schedule(debounceMs)
      }
      return
    }
    followUp = null
    if (outcome.kind === 'error') {
      setStatus('error', outcome.message)
      for (const w of sentWaiters) w.reject(new Error(outcome.message))
      const delay = retryDelays[Math.min(attempt, retryDelays.length - 1)] as number
      attempt += 1
      schedule(delay)
      return
    }
    pause = outcome.kind
    pauseMessage = outcome.kind === 'rejected' ? outcome.message : ''
    setStatus(outcome.kind, outcome.kind === 'rejected' ? outcome.message : undefined)
    const error = pausedError()
    for (const w of [...sentWaiters, ...waiters.splice(0)]) w.reject(error)
  }

  return {
    save(payload) {
      latest = { payload }
      dirty = true
      if (pause) return Promise.reject(pausedError())
      if (status !== 'error') setStatus('pending')
      return new Promise<void>((resolve, reject) => {
        waiters.push({ resolve, reject })
        if (status !== 'error') schedule(debounceMs)
      })
    },
    async flushNow(payload) {
      if (payload !== undefined) {
        latest = { payload }
        dirty = true
      }
      await flush(true)
    },
    resume() {
      if (pause !== 'unauthorized') return
      pause = null
      attempt = 0
      setStatus(dirty ? 'pending' : 'idle')
      if (dirty) void flush()
    },
    get status() {
      return status
    },
    get version() {
      return version
    },
  }
}
