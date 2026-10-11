export type SaveOutcome =
  | { kind: 'ok'; version: number }
  | { kind: 'conflict' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; message: string }

export type SaverStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'conflict' | 'unauthorized' | 'error'

export type SceneSaverDeps<T> = {
  put: (payload: T, expectedVersion: number) => Promise<SaveOutcome>
  initialVersion: number
  debounceMs?: number
  retryDelaysMs?: number[]
  onStatus?: (status: SaverStatus) => void
}

export type SceneSaver<T> = {
  save(payload: T): Promise<void>
  flushNow(payload?: T): Promise<void>
  readonly status: SaverStatus
  readonly version: number
}

type Waiter = { resolve: () => void; reject: (e: Error) => void }

/**
 * Autoguardado con debounce, un solo guardado en vuelo, reintentos y pausa ante 409/401.
 * `save()` devuelve una promesa que se resuelve cuando la escena quedó guardada (o el guardador
 * quedó en pausa), para que `<Editor>` muestre un estado de guardado verdadero.
 */
export function createSceneSaver<T>(deps: SceneSaverDeps<T>): SceneSaver<T> {
  const debounceMs = deps.debounceMs ?? 2000
  const retryDelays = deps.retryDelaysMs ?? [2000, 5000, 15000]
  let version = deps.initialVersion
  let status: SaverStatus = 'idle'
  let latest: { payload: T } | null = null
  let dirty = false
  let inFlight = false
  let paused = false
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let waiters: Waiter[] = []

  const setStatus = (s: SaverStatus) => {
    status = s
    deps.onStatus?.(s)
  }
  const settle = (error?: Error) => {
    const current = waiters
    waiters = []
    for (const w of current) error ? w.reject(error) : w.resolve()
  }
  const schedule = (ms: number) => {
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), ms)
  }

  async function flush(): Promise<void> {
    clearTimeout(timer)
    if (paused || !dirty || !latest) return settle()
    if (inFlight) return
    inFlight = true
    const sent = latest
    const sentWaiters = waiters
    waiters = []
    setStatus('saving')
    const outcome = await deps.put(sent.payload, version)
    inFlight = false
    if (outcome.kind === 'ok') {
      version = outcome.version
      attempt = 0
      if (latest === sent) dirty = false
      setStatus(dirty ? 'pending' : 'saved')
      for (const w of sentWaiters) w.resolve()
      if (dirty) schedule(debounceMs)
      return
    }
    if (outcome.kind === 'conflict' || outcome.kind === 'unauthorized') {
      paused = true
      setStatus(outcome.kind)
      for (const w of [...sentWaiters, ...waiters.splice(0)]) w.resolve()
      return
    }
    setStatus('error')
    for (const w of sentWaiters) w.reject(new Error(outcome.message))
    const delay = retryDelays[Math.min(attempt, retryDelays.length - 1)] as number
    attempt += 1
    schedule(delay)
  }

  return {
    save(payload) {
      latest = { payload }
      dirty = true
      if (paused) return Promise.resolve()
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
      await flush()
    },
    get status() {
      return status
    },
    get version() {
      return version
    },
  }
}
