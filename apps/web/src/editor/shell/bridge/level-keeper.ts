import type { CoreDeps } from './core'
import { levelsOf } from './levels'
import type { LevelMode } from './types'

export type LevelKeeperDeps = CoreDeps & {
  /** Parche de Madori en el visor (`__madoriHideAbove`): oculta las plantas por encima de la activa. */
  setHideAbove?(on: boolean): void
}

/**
 * Siempre hay una planta activa (al abrir, al salir de Recorrer, al borrarse la activa pasa a la más cercana) y, en Editar,
 * el 3D muestra la planta activa y las inferiores. Pascal no ofrece "ocultar las superiores" (solo `solo`, que esconde también
 * las de abajo), así que se enciende la bandera del parche del visor; en Ver sigue libre el modo de plantas de la persona.
 */
export type LevelKeeperOptions = {
  /** Reloj (ms); por omisión `Date.now`. */
  now?: () => number
  /** `true` cuando la persona ya tocó el editor (clic o tecla) desde que se abrió: desde ahí su elección de planta manda. */
  userTouched?: () => boolean
}

/** Tiempo en que, sin que nadie haya tocado nada, una planta distinta de la baja se considera restos de la carga de Pascal. */
export const SETTLE_MS = 5000

/** Marca el primer clic o tecla de la persona (en pruebas sin `window` nunca ocurre). */
function listenForUser(): () => boolean {
  let touched = false
  if (typeof window !== 'undefined') {
    const mark = () => {
      touched = true
    }
    window.addEventListener('pointerdown', mark, { capture: true, once: true })
    window.addEventListener('keydown', mark, { capture: true, once: true })
  }
  return () => touched
}

export function createLevelKeeper(deps: LevelKeeperDeps, options: LevelKeeperOptions = {}) {
  const now = options.now ?? Date.now
  let userTouched = options.userTouched
  let firstSeen: number | null = null
  let lastIndex: number | null = null
  let hiding = false
  let savedMode: LevelMode | null = null

  const keepActive = () => {
    const { buildingId, levels } = levelsOf(deps.scene.getState(), deps.viewer.getState())
    if (!buildingId || levels.length === 0) return
    firstSeen ??= now()
    const lowest = levels[0]
    // Al abrir, la planta activa es siempre la de menor índice (la baja): Pascal puede dejar otra al cargar. Solo la elección
    // de la persona (un clic o una tecla) o el paso del tiempo la libran de esa regla.
    const settling = now() - firstSeen < SETTLE_MS && !(userTouched?.() ?? false)
    if (settling && lowest && deps.viewer.getState().selection.levelId !== lowest.id) {
      lastIndex = lowest.level
      deps.viewer.getState().setSelection({ buildingId, levelId: lowest.id })
      return
    }
    const activeId = deps.viewer.getState().selection.levelId
    const active = levels.find((l) => l.id === activeId)
    if (active) {
      lastIndex = active.level
      return
    }
    const from = lastIndex ?? 0
    const nearest = [...levels].sort((a, b) => Math.abs(a.level - from) - Math.abs(b.level - from) || a.level - b.level)[0]
    if (nearest) deps.viewer.getState().setSelection({ buildingId, levelId: nearest.id })
  }

  const followFloor = () => {
    const edit = !deps.scene.getState().readOnly
    if (edit === hiding) return
    hiding = edit
    deps.setHideAbove?.(edit)
    const viewer = deps.viewer.getState()
    if (edit) {
      savedMode = viewer.levelMode
      if (viewer.levelMode !== 'stacked') viewer.setLevelMode('stacked')
    } else if (savedMode) {
      if (savedMode !== viewer.levelMode) viewer.setLevelMode(savedMode)
      savedMode = null
    }
  }

  const run = () => {
    keepActive()
    followFloor()
  }
  return {
    start(): () => void {
      userTouched ??= listenForUser()
      run()
      const stops = [deps.viewer.subscribe(run), deps.scene.subscribe(run)]
      return () => {
        for (const stop of stops) stop()
        if (hiding) deps.setHideAbove?.(false)
        hiding = false
      }
    },
  }
}
