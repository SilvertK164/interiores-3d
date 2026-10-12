import { vi } from 'vitest'
import type { BridgeDeps } from '../../src/editor/shell/bridge'
import type { EditorLike, EditorMode, HistoryState, SceneLike, SnapContext, SnapMode, ViewerLike } from '../../src/editor/shell/bridge/types'

export function createFakeStore<S extends object>(initial: S) {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    setState(partial: Partial<S>) {
      state = { ...state, ...partial }
      for (const listener of [...listeners]) listener()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * Dobles de los almacenes de Pascal con la forma que pide `BridgeDeps`. Empiezan como un proyecto en blanco recién abierto
 * (fase `structure`, herramienta de muro ya armada: lo que Pascal hace con un nivel vacío) y cada acción cambia el estado
 * como lo haría Pascal.
 */
export function createFakeDeps() {
  const editor = createFakeStore<EditorLike>({
    phase: 'structure',
    mode: 'build',
    tool: 'wall',
    viewMode: '3d',
    isFirstPersonMode: false,
    armToolMode: vi.fn((next: { mode: EditorMode; tool?: string }) => editor.setState({ mode: next.mode, tool: next.tool ?? null })),
    setPhase: vi.fn((phase: EditorLike['phase']) => editor.setState({ phase })),
    setViewMode: vi.fn((viewMode: EditorLike['viewMode']) => editor.setState({ viewMode })),
    setFirstPersonMode: vi.fn((enabled: boolean) => editor.setState({ isFirstPersonMode: enabled })),
    structureLayer: 'elements',
    gridSnapStep: 0.5,
    snappingModeByContext: { wall: 'grid', item: 'lines', polygon: 'grid', rotation: 'angles' },
    setStructureLayer: vi.fn((structureLayer: 'zones' | 'elements') => editor.setState({ structureLayer })),
    armMaterialPaint: vi.fn(() => editor.setState({ mode: 'material-paint', tool: null })),
    setMode: vi.fn((mode: EditorMode) => editor.setState({ mode })),
    setTool: vi.fn((tool: string | null) => editor.setState({ tool, ...(tool ? { mode: 'build' as const } : {}) })),
    setLastMeasurementKind: vi.fn(),
    setToolDefaults: vi.fn(),
    setGridSnapStep: vi.fn((gridSnapStep: number) => editor.setState({ gridSnapStep })),
    setSnappingMode: vi.fn((context: SnapContext, mode: SnapMode) =>
      editor.setState({ snappingModeByContext: { ...editor.getState().snappingModeByContext, [context]: mode } }),
    ),
    // @@fake-editor
  })
  const viewer = createFakeStore<ViewerLike>({
    selection: { buildingId: 'building_1', levelId: 'level_1', zoneId: null, selectedIds: [] },
    setSelection: vi.fn((update: Partial<ViewerLike['selection']>) =>
      viewer.setState({ selection: { ...viewer.getState().selection, ...update } }),
    ),
    // @@fake-viewer
  })
  const scene = createFakeStore<SceneLike>({ readOnly: false, nodes: {} })
  const historyListeners = new Set<() => void>()
  let historyState: HistoryState = { canUndo: false, canRedo: false }
  const history = {
    read: () => historyState,
    subscribe(listener: () => void) {
      historyListeners.add(listener)
      return () => {
        historyListeners.delete(listener)
      }
    },
    undo: vi.fn(),
    redo: vi.fn(),
    set(next: HistoryState) {
      historyState = next
      for (const listener of [...historyListeners]) listener()
    },
  }
  const undoTheme = vi.fn()
  const showHint = vi.fn()
  const deps = {
    editor,
    viewer,
    scene,
    history,
    applyTheme: vi.fn(() => undoTheme),
    hideCameraHint: vi.fn(() => showHint),
    acquireReadOnly: vi.fn(() => {
      scene.setState({ readOnly: true })
      return () => scene.setState({ readOnly: false })
    }),
    cancelActiveTool: vi.fn(),
    createLevel: vi.fn((_input: { buildingId: string; level: number }) => 'level_nuevo'),
    // @@fake-deps
  } satisfies BridgeDeps
  /** Estado crudo de los cuatro orígenes (lo que entrega `bridge.snapshot()`): los selectores puros se prueban con esto. */
  const snapshot = () => ({
    editor: editor.getState(),
    viewer: viewer.getState(),
    scene: scene.getState(),
    history: history.read(),
  })
  return { deps, editor, viewer, scene, history, undoTheme, showHint, snapshot }
}
