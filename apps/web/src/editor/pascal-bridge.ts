import * as Core from '@pascal-app/core'
import * as Pascal from '@pascal-app/editor'
import { flushSync } from 'react-dom'
import { Vector3 } from 'three'
import { appFontClasses } from '@/components/AppShell'
import { commitCabinetFields, isCabinetNode } from './cabinet-commit'
import { type ShellBridge, createBridge } from './shell/bridge'
import type { CatalogDeps } from './shell/bridge/catalog'
import type { CoreDeps, HistoryPort } from './shell/bridge/core'
import type { LevelsDeps } from './shell/bridge/levels'
import type { EditDeps } from './shell/bridge/edit'
import type { MaterialsDeps } from './shell/bridge/materials'
import type { ModeDeps } from './shell/bridge/mode'
import type { ViewDeps } from './shell/bridge/view'
import type { MaterialItemLike } from './shell/materials-model'
import { DECISIONS } from './shell/decisions'
import { keepCarpetsUnder } from './carpet-watch'
import { frameDeps } from './frame-deps'
import { imageDeps } from './export/pascal-image'
import { planDeps } from './export/pascal-plan'
import { levelManageDeps } from './level-manage-deps'
import { nodePresets } from './node-presets'
import { createViewStorage } from './shell/view-storage'

/**
 * Único archivo de `src/editor` que toca los almacenes y funciones de Pascal para el shell: `src/editor/shell/` usa tipos propios
 * (lo vigila `shell-boundaries.test.ts`) y recibe de aquí lo que necesita. TypeScript comprueba que `useEditor`, `useViewer` y
 * `useScene` tengan la forma que piden las interfaces del puente. Cada tarea suma su función `xxxDeps()` arriba de `// @@deps`.
 */

/** Escena `studio` (apariencia clara), metros, y las fuentes de la interfaz en <body>, donde cuelgan los portales de Pascal. */
export function applyEditorTheme(): () => void {
  const viewer = Pascal.useViewer.getState()
  viewer.setSceneTheme('studio')
  viewer.setUnit('metric')
  const classes = appFontClasses.split(' ')
  document.body.classList.add(...classes)
  return () => document.body.classList.remove(...classes)
}

/** Historial: `getHistoryCommandState` de Pascal, o (decisión de la Tarea 0b) el historial de la escena leído directamente. */
function historyPort(): HistoryPort {
  const fromPascal = DECISIONS.historySource === 'pascal'
  return {
    read: fromPascal
      ? () => {
          const { canUndo, canRedo } = Pascal.getHistoryCommandState()
          return { canUndo, canRedo }
        }
      : () => {
          const temporal = Pascal.useScene.temporal.getState()
          return { canUndo: temporal.pastStates.length > 0, canRedo: temporal.futureStates.length > 0 }
        },
    subscribe: fromPascal
      ? Pascal.subscribeHistoryCommandState
      : (listener) => Pascal.useScene.temporal.subscribe(listener),
    undo: () => {
      Pascal.runUndo()
    },
    redo: () => {
      Pascal.runRedo()
    },
  }
}

function coreDeps(): CoreDeps {
  return {
    editor: Pascal.useEditor,
    viewer: Pascal.useViewer,
    scene: Pascal.useScene,
    history: historyPort(),
    applyTheme: applyEditorTheme,
    viewStore: createViewStorage(),
    // Lo lee el parche de Madori de `level-utils.js` del visor (`patches/@pascal-app__viewer@1.0.3.patch`).
    setHideAbove: (on) => {
      ;(globalThis as { __madoriHideAbove?: boolean }).__madoriHideAbove = on
    },
    keepCarpetsUnder,
    decoupleViews: () => {
      // Lo leen los parches de Madori de `floorplan-camera-sync.ts` y `floorplan-panel.tsx` (`patches/@pascal-app__editor@1.0.3.patch`).
      ;(globalThis as { __madoriDecoupled?: boolean }).__madoriDecoupled = true
      return () => {
        ;(globalThis as { __madoriDecoupled?: boolean; __madoriPlanFit?: unknown }).__madoriDecoupled = false
        ;(globalThis as { __madoriPlanFit?: unknown }).__madoriPlanFit = undefined
      }
    },
    // `focus([])` oculta el aviso de cámara en inglés (editor/src/store/use-camera-hint-focus.ts); `focus(null)` lo devuelve.
    hideCameraHint: () => {
      Pascal.useCameraHintFocus.getState().focus([])
      return () => Pascal.useCameraHintFocus.getState().focus(null)
    },
  }
}

function modeDeps(): ModeDeps {
  return {
    acquireReadOnly: Pascal.acquireSceneReadOnlyLease,
    cancelActiveTool: () => {
      Pascal.cancelActiveTool()
    },
  }
}

/** Misma receta que "Add level above" del selector de planta de Pascal (editor/src/components/ui/floating-level-selector.tsx). */
function levelsDeps(): LevelsDeps {
  return {
    createLevel: ({ buildingId, level }) => {
      const node = Core.LevelNode.parse({ level, height: Core.DEFAULT_LEVEL_HEIGHT, children: [], parentId: buildingId })
      Pascal.useScene.getState().createNode(node, buildingId as never)
      return node.id
    },
  }
}

type PascalCatalogItem = (typeof Pascal.CATALOG_ITEMS)[number]

function catalogDeps(): CatalogDeps {
  return {
    // Las tarjetas salen de `CATALOG_ITEMS` de Pascal (ya con rutas locales): el ítem que vuelve es uno de ellos.
    activateCatalogItem: (item) => Pascal.activateCatalogItem(item as PascalCatalogItem),
  }
}

/** La biblioteca de materiales de Pascal (solo los suyos; los "míos" y los de la comunidad son de otra función). */
const MATERIAL_LIBRARY: readonly MaterialItemLike[] = Core.MATERIAL_CATALOG.filter(
  (item) => (item.source ?? 'pascal') === 'pascal',
).map((item) => ({
  id: item.id,
  label: item.label,
  category: item.category,
  surfaces: item.surfaces,
  thumbnail: item.previewThumbnailUrl,
  color: item.previewColor,
}))

function materialsDeps(): MaterialsDeps {
  return {
    useMaterialsModel() {
      const paint = Pascal.useMaterialPaintPanelModel()
      return {
        items: MATERIAL_LIBRARY,
        selectedId: Core.getLibraryMaterialIdFromRef(paint.activePaintMaterial?.materialPreset),
        select: (id) => paint.selectMaterial(Core.toLibraryMaterialRef(id)),
      }
    },
  }
}

type AnyNode = Core.AnyNode
type AnyNodeId = Core.AnyNodeId

/** Editar, duplicar y borrar con las mismas funciones que usa el inspector de Pascal (`parametric-inspector.tsx`). */
function editDeps(): EditDeps {
  return {
    commitFields: (id, patch) => {
      const node = Core.useScene.getState().nodes[id as AnyNodeId]
      // Los gabinetes se redimensionan con la rutina de sus tiradores (reacomoda módulos y vecinos); el resto, con la del inspector.
      if (node && isCabinetNode(node)) commitCabinetFields(node, patch)
      else Pascal.commitParametricNodeFields(id as AnyNodeId, patch as Partial<AnyNode>)
    },
    deleteNodes: (ids) => Pascal.useScene.getState().deleteNodes(ids as AnyNodeId[]),
    duplicateNode: ({ id, rootPatch }) => {
      const scene = Pascal.useScene.getState()
      const subtree = Core.collectSubtree(scene.nodes, id as AnyNodeId)
      if (!subtree) return null
      const clone = Core.cloneNodesInto([subtree.root, ...subtree.descendants], {
        rootId: id as AnyNodeId,
        parentId: (subtree.root.parentId ?? undefined) as AnyNodeId | undefined,
      })
      // `cloneNodesInto` no reasigna `wallId` (la referencia al muro que aloja la abertura): en un muro copiado, sus puertas
      // y ventanas tienen que apuntar al muro nuevo, no al original.
      const copies = clone.nodes.map((node) => {
        const own = (node.id === clone.rootId ? { ...node, ...rootPatch } : node) as AnyNode & { wallId?: string }
        const host = own.wallId ? clone.idMap.get(own.wallId as AnyNodeId) : undefined
        return host ? ({ ...own, wallId: host } as AnyNode) : (own as AnyNode)
      })
      Core.runAsSingleSceneHistoryStep(Pascal.useScene, () =>
        Pascal.useScene.getState().createNodes(copies.map((node) => ({ node, parentId: (node.parentId ?? undefined) as AnyNodeId | undefined }))),
      )
      return clone.rootId
    },
  }
}

/** Altura de los ojos al empezar a recorrer: el jugador cae solo hasta el piso. */
const WALK_EYE_HEIGHT = 1.7

const CAMERA_EVENTS = {
  'orbit-left': 'camera-controls:orbit-ccw',
  'orbit-right': 'camera-controls:orbit-cw',
  top: 'camera-controls:top-view',
} as const

/**
 * Vista 3D. Recorrer repite la receta de `requestWalkthroughPointerLock` de Pascal (no se exporta): primera persona con
 * `flushSync`, para que sus controles ya estén montados cuando llegue el puntero, y puntero bloqueado sobre el lienzo, todo
 * dentro del clic. Si el navegador lo rechaza (espera de ~1,25 s tras un desbloqueo), un clic sobre el lienzo lo vuelve a pedir.
 */
function viewDeps(): ViewDeps {
  return {
    moveCamera: (move) => Core.emitter.emit(CAMERA_EVENTS[move]),
    startWalkthrough: (spawn, levelId) => {
      // Punto de partida dentro del edificio (lo lee el parche de `first-person-controls.tsx`): de coordenadas de la planta a las del mundo.
      const level = levelId ? Core.sceneRegistry.nodes.get(levelId) : null
      if (spawn && level) {
        level.updateWorldMatrix(true, false)
        const world = level.localToWorld(new Vector3(spawn.x, 0, spawn.z))
        ;(globalThis as { __madoriSpawn?: unknown }).__madoriSpawn = { position: [world.x, world.y + WALK_EYE_HEIGHT, world.z], yaw: spawn.yaw }
        const stop = Pascal.useEditor.subscribe((state) => {
          if (state.isFirstPersonMode) return
          stop()
          ;(globalThis as { __madoriSpawn?: unknown }).__madoriSpawn = undefined
        })
      }
      flushSync(() => Pascal.useEditor.getState().setFirstPersonMode(true))
      const canvas = document.querySelector<HTMLCanvasElement>('[data-pascal-viewer-3d] canvas')
      if (!canvas) return
      if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = -1
      canvas.focus({ preventScroll: true })
      const request = canvas.requestPointerLock() as unknown as Promise<void> | undefined
      request?.catch?.(() => undefined)
    },
  }
}

export function createPascalBridge(): ShellBridge {
  return createBridge({
    ...coreDeps(),
    ...modeDeps(),
    ...levelsDeps(),
    ...catalogDeps(),
    ...materialsDeps(),
    ...editDeps(),
    ...viewDeps(),
    ...nodePresets(),
    ...levelManageDeps(),
    ...frameDeps(),
    ...planDeps(),
    ...imageDeps(),
    // @@deps
  })
}
