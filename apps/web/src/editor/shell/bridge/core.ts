import { createLevelKeeper } from './level-keeper'
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
  /**
   * Desenlaza el plano 2D de la cámara 3D (parche `__madoriDecoupled` de `@pascal-app/editor`): girar, orbitar, hacer zoom,
   * recorrer o encuadrar en uno no mueve al otro. Devuelve cómo volver a enlazarlos.
   */
  decoupleViews?(): () => void
  /** Las alfombras que se coloquen pasan al principio de la planta (debajo de lo demás en el plano 2D); devuelve cómo dejar de vigilar. */
  keepCarpetsUnder?(): () => void
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
      const recouple = deps.decoupleViews?.() ?? (() => {})
      const stopCarpets = deps.keepCarpetsUnder?.() ?? (() => {})
      const stopKeeper = createLevelKeeper(deps).start()
      const stopView = deps.editor.subscribe(() => {
        const view = deps.editor.getState().viewMode
        if (view === last) return
        last = view
        deps.viewStore?.write(view)
      })
      return () => {
        stopView()
        stopKeeper()
        recouple()
        stopCarpets()
        showHint()
        undoTheme()
      }
    },
  }
}
