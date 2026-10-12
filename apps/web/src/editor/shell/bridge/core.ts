import type { BridgeSnapshot, EditorLike, HistoryState, SceneLike, StoreLike, ViewerLike } from './types'

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
      return () => {
        showHint()
        undoTheme()
      }
    },
  }
}
