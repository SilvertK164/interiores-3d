import { DoorNode, ItemNode, WallNode, WindowNode, ZoneNode, useScene } from '@pascal-app/core'
import { armToolMode, getHistoryCommandState, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import type { PascalChrome } from './chrome'

type SceneNode = { id: string; type: string }
type E2eOptions = { setChrome?: (chrome: PascalChrome) => void }

/** Un sofá del catálogo para los ganchos que arman escenas. */
const SOFA = {
  id: 'sofa',
  category: 'furniture',
  name: 'Sofa',
  thumbnail: '/items/sofa/thumbnail.webp',
  src: '/items/sofa/model.glb',
  dimensions: [2.06, 0.74, 1.01] as [number, number, number],
}

/** Solo para Playwright: lee y modifica la escena sin depender de píxeles. */
export function createE2eHooks(options: E2eOptions = {}) {
  const nodes = () => Object.values(useScene.getState().nodes) as SceneNode[]
  const firstOf = (type: string) => nodes().find((n) => n.type === type)?.id
  /** Crea el nodo bajo ese padre y devuelve su id (`null` si no hay padre). */
  const createUnder = (node: { id: string }, parentId: string | undefined) => {
    if (!parentId) return null
    useScene.getState().createNode(node as never, parentId as never)
    return node.id
  }
  return {
    ready: () => nodes().some((n) => n.type === 'level'),
    counts: () => {
      const total: Record<string, number> = {}
      for (const n of nodes()) total[n.type] = (total[n.type] ?? 0) + 1
      return total
    },
    /** Solo para las capturas de las plantillas: 'up' | 'cutaway' | 'down' | 'translucent'. */
    setWallMode: (mode: string) => useViewer.getState().setWallMode(mode as never),
    wallCount: () => nodes().filter((n) => n.type === 'wall').length,
    theme: () => ({ sceneTheme: useViewer.getState().sceneTheme, unit: useViewer.getState().unit }),
    addWall: () => {
      const level = nodes().find((n) => n.type === 'level')
      if (!level) throw new Error('No hay nivel donde agregar el muro')
      useScene.getState().createNode(WallNode.parse({ start: [0, 0], end: [4, 0] }), level.id as never)
    },
    /** Muestra u oculta el chrome de Pascal (la prueba de guarda lo enciende para comprobar que sus selectores existen). */
    setChrome: (chrome: PascalChrome) => options.setChrome?.(chrome),
    /** Selecciona el primer muro y devuelve su id (`null` si no hay). */
    selectFirstWall: () => {
      const wall = nodes().find((n) => n.type === 'wall')
      if (!wall) return null
      useViewer.getState().setSelection({ selectedIds: [wall.id] as never })
      return wall.id
    },
    armWall: () => armToolMode({ mode: 'build', tool: 'wall' }),
    /** Lectura directa de Pascal (no del shell): lo que las pruebas comparan con lo que el shell muestra. */
    state: () => {
      const editor = useEditor.getState()
      const selection = useViewer.getState().selection
      const history = getHistoryCommandState()
      return {
        phase: editor.phase,
        mode: editor.mode,
        tool: editor.tool,
        viewMode: editor.viewMode,
        readOnly: useScene.getState().readOnly,
        firstPerson: editor.isFirstPersonMode,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        selectedIds: [...selection.selectedIds] as string[],
        zoneId: selection.zoneId as string | null,
        levelId: selection.levelId as string | null,
        gridSnapStep: editor.gridSnapStep,
        snapWall: editor.snappingModeByContext.wall,
        snapItem: editor.snappingModeByContext.item,
        paintMaterial: editor.activePaintMaterial?.materialPreset ?? null,
      }
    },
    select: (id: string | null) => useViewer.getState().setSelection({ selectedIds: id ? ([id] as never) : [], zoneId: null }),
    /** El nodo tal como lo tiene Pascal (copia simple), o `null` si ya no existe. */
    node: (id: string) => {
      const node = useScene.getState().nodes[id as never]
      return node ? (JSON.parse(JSON.stringify(node)) as Record<string, unknown>) : null
    },
    deleteNode: (id: string) => useScene.getState().deleteNode(id as never),
    /** Agregan una puerta o una ventana en el primer muro y devuelven su id (`null` si no hay muro). */
    addDoor: () => {
      const wallId = firstOf('wall')
      return createUnder(DoorNode.parse({ position: [1, 1.05, 0], wallId, parentId: wallId }), wallId)
    },
    addWindow: () => {
      const wallId = firstOf('wall')
      return createUnder(WindowNode.parse({ position: [2.5, 1.5, 0], wallId, parentId: wallId }), wallId)
    },
    /** Agregan un mueble o un ambiente en el primer nivel y devuelven su id. */
    addItem: () => createUnder(ItemNode.parse({ position: [1, 0, 1.5], asset: SOFA }), firstOf('level')),
    addZone: () => createUnder(ZoneNode.parse({ name: 'Zone 1', polygon: [[0, 0], [3, 0], [3, 2], [0, 2]] }), firstOf('level')),
  }
}

export type E2eApi = ReturnType<typeof createE2eHooks>

export function installE2eHooks(options?: E2eOptions): void {
  ;(window as unknown as { __e2e: E2eApi }).__e2e = createE2eHooks(options)
}
