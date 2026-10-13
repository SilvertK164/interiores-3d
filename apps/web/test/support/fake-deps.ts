import { vi } from 'vitest'
import type { BridgeDeps } from '../../src/editor/shell/bridge'
import type { ClusterItem } from '../../src/editor/shell/bridge/cluster'
import type { EditorLike, EditorMode, HistoryState, SceneLike, SnapContext, SnapMode, ViewerLike } from '../../src/editor/shell/bridge/types'
import type { MaterialItemLike } from '../../src/editor/shell/materials-model'
import type { LevelMeasure, PlanBuildArgs, PlanResult } from '../../src/lib/export/types'

/** Biblioteca de materiales de mentira: un color liso, una madera y un techo. */
export const FAKE_MATERIALS: MaterialItemLike[] = [
  { id: 'preset-white', label: 'White', category: 'colors', color: '#e9e9e9' },
  { id: 'wood-woodfine1', label: 'Wood Fine 1', category: 'wood', surfaces: ['floor', 'wall', 'furniture'], thumbnail: '/material/wood/1.webp' },
  { id: 'roof-claytiles', label: 'Clay Tiles', category: 'roofing', surfaces: ['roof'] },
]

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
    selectedItem: null,
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
    navigationSyncPose: null,
    publishNavigationSyncPose: vi.fn((pose: Omit<NonNullable<EditorLike['navigationSyncPose']>, 'revision'>) =>
      editor.setState({ navigationSyncPose: { ...pose, revision: (editor.getState().navigationSyncPose?.revision ?? 0) + 1 } }),
    ),
    // @@fake-editor
  })
  const viewer = createFakeStore<ViewerLike>({
    selection: { buildingId: 'building_1', levelId: 'level_1', zoneId: null, selectedIds: [] },
    setSelection: vi.fn((update: Partial<ViewerLike['selection']>) =>
      viewer.setState({ selection: { ...viewer.getState().selection, ...update } }),
    ),
    wallMode: 'up',
    levelMode: 'stacked',
    cameraMode: 'perspective',
    shading: 'solid',
    setWallMode: vi.fn((wallMode: ViewerLike['wallMode']) => viewer.setState({ wallMode })),
    setLevelMode: vi.fn((levelMode: ViewerLike['levelMode']) => viewer.setState({ levelMode })),
    setCameraMode: vi.fn((cameraMode: ViewerLike['cameraMode']) => viewer.setState({ cameraMode })),
    setShading: vi.fn((shading: ViewerLike['shading']) => viewer.setState({ shading })),
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
  const materials = { items: FAKE_MATERIALS, selectedId: null as string | null, select: vi.fn() }
  let clusterSeq = 0
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
    activateCatalogItem: vi.fn(),
    // El mismo objeto en cada llamada: las pruebas miran `deps.useMaterialsModel().select`.
    useMaterialsModel: vi.fn(() => materials),
    commitFields: vi.fn(),
    duplicateNode: vi.fn((_input: { id: string; rootPatch: Record<string, unknown> }): string | null => 'copia_1'),
    deleteNodes: vi.fn(),
    moveCamera: vi.fn(),
    startWalkthrough: vi.fn(() => editor.setState({ isFirstPersonMode: true })),
    frameViews: vi.fn(),
    updateLevels: vi.fn(),
    duplicateLevel: vi.fn((_id: string): string | null => 'level_copia'),
    deleteLevel: vi.fn(),
    armNodePatch: vi.fn(),
    clearNodePatch: vi.fn(),
    measureLevels: vi.fn(async (): Promise<LevelMeasure[]> => []),
    buildPlan: vi.fn(async (_args: PlanBuildArgs): Promise<PlanResult> => ({ blob: new Blob(['%PDF-1.4']), pages: 1, skippedImages: 0 })),
    captureView: vi.fn(async () => new Blob(['img'], { type: 'image/webp' })),
    // Como Pascal: los muebles quedan en la escena (hijos de la planta) y devuelve sus ids en el mismo orden.
    insertItems: vi.fn((input: { parentId: string; items: readonly ClusterItem[] }): string[] => {
      const ids = input.items.map(() => `item_foto_${++clusterSeq}`)
      scene.setState({
        nodes: { ...scene.getState().nodes, ...Object.fromEntries(ids.map((id) => [id, { id, type: 'item', parentId: input.parentId }])) },
      })
      return ids
    }),
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
