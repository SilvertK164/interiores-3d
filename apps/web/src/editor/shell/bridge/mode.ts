import type { CoreDeps } from './core'
import type { ViewMode } from './types'

export type ModeDeps = {
  /** `acquireSceneReadOnlyLease` de Pascal (core): solo lectura con cuenta de referencias; devuelve cómo soltarlo. */
  acquireReadOnly(): () => void
  /** `cancelActiveTool` de Pascal (editor): cancela el borrador en curso (un muro a medias) y vuelve a Seleccionar. */
  cancelActiveTool(): void
}

/**
 * Ver = solo lectura de Pascal (D3). Se usa el préstamo de solo lectura y NO `isVersionPreviewMode`, que además pausaría
 * el autoguardado: un cambio hecho justo antes de pasar a Ver se perdería al recargar. Como Pascal sigue dibujando asas
 * al elegir algo, Ver mantiene la selección vacía.
 */
export function createModeSlice(deps: CoreDeps & ModeDeps) {
  let lease: (() => void) | null = null
  let stopGuard: (() => void) | null = null
  const clearSelection = () => deps.viewer.getState().setSelection({ selectedIds: [], zoneId: null })
  const leaveView = () => {
    stopGuard?.()
    stopGuard = null
    lease?.()
    lease = null
  }
  return {
    setMode(mode: 'ver' | 'editar'): void {
      if (mode === 'editar') {
        leaveView()
        return
      }
      if (lease) return
      deps.cancelActiveTool()
      deps.editor.getState().armToolMode({ mode: 'select' })
      clearSelection()
      lease = deps.acquireReadOnly()
      stopGuard = deps.viewer.subscribe(() => {
        const { selection } = deps.viewer.getState()
        if (selection.selectedIds.length > 0 || selection.zoneId) clearSelection()
      })
    },
    setView(view: ViewMode): void {
      deps.editor.getState().setViewMode(view)
    },
    undo(): void {
      deps.history.undo()
    },
    redo(): void {
      deps.history.redo()
    },
    /** Suelta el solo lectura (al desmontar el shell). */
    dispose: leaveView,
  }
}
