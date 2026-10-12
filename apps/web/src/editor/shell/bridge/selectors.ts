import type { BridgeSnapshot, EditorMode, Phase, ViewMode } from './types'

export type ShellState = {
  mode: 'ver' | 'editar'
  view: ViewMode
  canUndo: boolean
  canRedo: boolean
  firstPerson: boolean
  phase: Phase
  editorMode: EditorMode
  tool: string | null
}

/** Lo que muestran la barra y el dock, leído del estado real de Pascal: nunca se supone (Pascal restaura fase y herramienta). */
export function selectShellState(s: BridgeSnapshot): ShellState {
  return {
    mode: s.scene.readOnly ? 'ver' : 'editar',
    view: s.editor.viewMode,
    canUndo: s.history.canUndo,
    canRedo: s.history.canRedo,
    firstPerson: s.editor.isFirstPersonMode,
    phase: s.editor.phase,
    editorMode: s.editor.mode,
    tool: s.editor.tool,
  }
}
