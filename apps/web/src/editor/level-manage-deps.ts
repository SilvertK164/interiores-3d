import * as Core from '@pascal-app/core'
import * as Pascal from '@pascal-app/editor'
import { levelDisplayName } from '@/lib/editor-names'
import type { LevelsManageDeps } from './shell/bridge/level-manage'

type AnyNode = Core.AnyNode
type AnyNodeId = Core.AnyNodeId
type Wired = AnyNode & { wallId?: string; fromLevelId?: string | null; toLevelId?: string | null }

const scene = () => Pascal.useScene.getState()
/** Todo lo de una planta en un solo paso del historial (así Deshacer la restaura completa). */
const oneStep = (fn: () => void) => Core.runAsSingleSceneHistoryStep(Pascal.useScene, fn)

const levelsOfBuilding = (buildingId: string | null | undefined) =>
  Object.values(scene().nodes)
    .filter((n): n is Extract<AnyNode, { type: 'level' }> => n.type === 'level' && n.parentId === buildingId)
    .sort((a, b) => a.level - b.level)

/**
 * Gestión de plantas con las mismas funciones de Pascal que usa su selector de plantas (`floating-level-selector.tsx`, cuyos
 * ayudantes no se exportan): `updateNodes` (reordenar, renombrar, altura; `syncStairRises` reajusta los tramos de escalera),
 * `collectSubtree` y `cloneNodesInto` (duplicar) y `deleteNode`.
 */
export function levelManageDeps(): LevelsManageDeps {
  return {
    updateLevels: (patches) => scene().updateNodes(patches.map((p) => ({ id: p.id as AnyNodeId, data: p.data as Partial<AnyNode> }))),
    duplicateLevel: (id) => {
      const subtree = Core.collectSubtree(scene().nodes, id as AnyNodeId)
      const original = subtree?.root
      if (!(subtree && original && original.type === 'level')) return null
      let copyId: string | null = null
      oneStep(() => {
        // Las plantas de arriba se corren un lugar para que la copia quede justo sobre la original.
        const above = levelsOfBuilding(original.parentId).filter((l) => l.level > original.level)
        if (above.length > 0) scene().updateNodes(above.map((l) => ({ id: l.id as AnyNodeId, data: { level: l.level + 1 } as Partial<AnyNode> })))
        const clone = Core.cloneNodesInto([subtree.root, ...subtree.descendants], {
          rootId: original.id as AnyNodeId,
          parentId: (original.parentId ?? undefined) as AnyNodeId | undefined,
        })
        const copies = clone.nodes.map((node) => {
          const own = { ...node } as Wired
          // Las referencias por id (muro de una puerta, plantas de una escalera) apuntan a la copia, no a la original.
          if (own.wallId) own.wallId = (clone.idMap.get(own.wallId as AnyNodeId) as string | undefined) ?? own.wallId
          if (own.fromLevelId) own.fromLevelId = (clone.idMap.get(own.fromLevelId as AnyNodeId) as string | undefined) ?? own.fromLevelId
          if (own.toLevelId) own.toLevelId = (clone.idMap.get(own.toLevelId as AnyNodeId) as string | undefined) ?? own.toLevelId
          if (own.id === clone.rootId) Object.assign(own, { level: original.level + 1, name: `${levelDisplayName(original)} (copia)` })
          return own as AnyNode
        })
        scene().createNodes(copies.map((node) => ({ node, parentId: (node.parentId ?? undefined) as AnyNodeId | undefined })))
        copyId = clone.rootId
      })
      return copyId
    },
    deleteLevel: (id) => {
      const subtree = Core.collectSubtree(scene().nodes, id as AnyNodeId)
      const inside = new Set([id, ...(subtree?.descendants ?? []).map((n) => n.id as string)])
      oneStep(() => {
        // Las escaleras de otras plantas que subían o bajaban a ésta quedan sin destino (sin ids que ya no existen).
        const loose = Object.values(scene().nodes).filter((n): n is Wired => {
          if (n.type !== 'stair' || inside.has(n.id)) return false
          const stair = n as Wired
          return stair.fromLevelId === id || stair.toLevelId === id
        })
        if (loose.length > 0) {
          scene().updateNodes(
            loose.map((stair) => ({
              id: stair.id as AnyNodeId,
              data: { ...(stair.fromLevelId === id ? { fromLevelId: null } : {}), ...(stair.toLevelId === id ? { toLevelId: null } : {}) } as Partial<AnyNode>,
            })),
          )
        }
        scene().deleteNode(id as AnyNodeId)
      })
    },
  }
}
