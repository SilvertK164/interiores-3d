import * as Core from '@pascal-app/core'
import * as Pascal from '@pascal-app/editor'
import { appFontClasses } from '@/components/AppShell'
import { type ShellBridge, createBridge } from './shell/bridge'
import type { CatalogDeps } from './shell/bridge/catalog'
import type { CoreDeps, HistoryPort } from './shell/bridge/core'
import type { LevelsDeps } from './shell/bridge/levels'
import type { ModeDeps } from './shell/bridge/mode'
import { DECISIONS } from './shell/decisions'
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

export function createPascalBridge(): ShellBridge {
  return createBridge({
    ...coreDeps(),
    ...modeDeps(),
    ...levelsDeps(),
    ...catalogDeps(),
    // @@deps
  })
}
