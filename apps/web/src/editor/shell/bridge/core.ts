import { createLevelKeeper } from './level-keeper'
import { type CameraPort, createPlanNorth } from './plan-north'
import type { BridgeSnapshot, ViewMode, EditorLike, HistoryState, SceneLike, StoreLike, ViewerLike } from './types'

export type HistoryPort = {
  read(): HistoryState
  subscribe(listener: () => void): () => void
  undo(): void
  redo(): void
}

export type CoreDeps = {
  editor: StoreLike<EditorLike>
  viewer: StoreLike<ViewerLike>
  scene: StoreLike<SceneLike>
  history: HistoryPort
  /** Escena `studio`, metros y fuentes de la interfaz en <body>; devuelve cómo deshacerlo. */
  applyTheme(): () => void
  /** Oculta el aviso de cámara en inglés de Pascal; devuelve cómo volver a mostrarlo. */
  hideCameraHint(): () => void
  /** Conserva la vista 2D / 3D / Ambas entre recargas (Pascal la pierde: sus paneles la pisan antes de rehidratar). */
  /** Cámara 3D de Pascal: con ella el plano entra recto (norte arriba) al pasar a 2D o a Ambas. */
  camera?: CameraPort
  /** Pide al plano de Pascal (parche `__madoriPlanNorth`) ignorar el azimut de la cámara 3D; devuelve cómo soltarlo. */
  lockPlanNorth?(): () => void
  setHideAbove?(on: boolean): void
  viewStore?: { read(): ViewMode | null; write(view: ViewMode): void }
}

export function createCoreSlice(deps: CoreDeps) {
  return {
    /** Avisa cuando cambia cualquiera de los cuatro orígenes (editor, visor, escena o historial). */
    subscribe(listener: () => void): () => void {
      const stops = [
        deps.editor.subscribe(listener),
        deps.viewer.subscribe(listener),
        deps.scene.subscribe(listener),
        deps.history.subscribe(listener),
      ]
      return () => {
        for (const stop of stops) stop()
      }
    },
    /** Estado crudo actual: los selectores puros (`selectors.ts`) lo transforman. */
    snapshot(): BridgeSnapshot {
      return {
        editor: deps.editor.getState(),
        viewer: deps.viewer.getState(),
        scene: deps.scene.getState(),
        history: deps.history.read(),
      }
    },
    /** Al montar el shell: tema claro y sin el aviso de cámara de Pascal. Devuelve la función que lo deshace. */
    mountDefaults(): () => void {
      const undoTheme = deps.applyTheme()
      const showHint = deps.hideCameraHint()
      const saved = deps.viewStore?.read()
      if (saved && saved !== deps.editor.getState().viewMode) deps.editor.getState().setViewMode(saved)
      let last = deps.editor.getState().viewMode
      const unlockNorth = deps.lockPlanNorth?.() ?? (() => {})
      const stopKeeper = createLevelKeeper(deps).start()
      const stopNorth = deps.camera ? createPlanNorth(deps.editor, deps.camera).start() : () => {}
      const stopView = deps.editor.subscribe(() => {
        const view = deps.editor.getState().viewMode
        if (view === last) return
        last = view
        deps.viewStore?.write(view)
      })
      return () => {
        stopView()
        stopNorth()
        stopKeeper()
        unlockNorth()
        showHint()
        undoTheme()
      }
    },
  }
}
