/**
 * Lo mínimo que el shell lee y llama de Pascal, con tipos propios: nada de `src/editor/shell` ni de sus pruebas importa Pascal.
 * `src/editor/pascal-bridge.ts` enchufa los almacenes reales (TypeScript comprueba que tengan esta forma).
 * Cada tarea agrega sus miembros arriba de las líneas `// @@…`.
 */
export type Phase = 'site' | 'structure' | 'furnish'
export type EditorMode = 'select' | 'edit' | 'delete' | 'build' | 'material-paint' | 'terrain-sculpt'
export type ViewMode = '2d' | '3d' | 'split'
export type SnapMode = 'grid' | 'lines' | 'angles' | 'off'
export type SnapContext = 'wall' | 'item' | 'polygon' | 'rotation'

export type StoreLike<S> = { getState(): S; subscribe(listener: () => void): () => void }

/** `useEditor` de Pascal (editor/src/store/use-editor.tsx). */
export type EditorLike = {
  phase: Phase
  mode: EditorMode
  tool: string | null
  viewMode: ViewMode
  isFirstPersonMode: boolean
  armToolMode(next: { mode: EditorMode; tool?: string }): void
  setPhase(phase: Phase): void
  setViewMode(mode: ViewMode): void
  setFirstPersonMode(enabled: boolean): void
  structureLayer: 'zones' | 'elements'
  gridSnapStep: number
  snappingModeByContext: Record<SnapContext, SnapMode>
  setStructureLayer(layer: 'zones' | 'elements'): void
  armMaterialPaint(): void
  setMode(mode: EditorMode): void
  setTool(tool: string | null): void
  setLastMeasurementKind(kind: string): void
  setToolDefaults(tool: string, defaults: Record<string, unknown> | null): void
  setGridSnapStep(step: number): void
  setSnappingMode(context: SnapContext, mode: SnapMode): void
  // @@editor-like
}

export type SelectionLike = {
  buildingId: string | null
  levelId: string | null
  zoneId: string | null
  selectedIds: readonly string[]
}

/** `useViewer` de Pascal (viewer/dist/store/use-viewer.d.ts). */
export type ViewerLike = {
  selection: SelectionLike
  setSelection(update: Partial<{ buildingId: string | null; levelId: string | null; zoneId: string | null; selectedIds: string[] }>): void
  // @@viewer-like
}

export type SceneNodeLike = { id: string; type: string; parentId?: string | null; children?: readonly string[] }

/** `useScene` de Pascal (core/dist/store/use-scene.d.ts). */
export type SceneLike = {
  readOnly: boolean
  nodes: Readonly<Record<string, SceneNodeLike>>
  // @@scene-like
}

export type HistoryState = { canUndo: boolean; canRedo: boolean }

/** Estado crudo que leen los selectores puros (`selectors.ts`). */
export type BridgeSnapshot = { editor: EditorLike; viewer: ViewerLike; scene: SceneLike; history: HistoryState }
