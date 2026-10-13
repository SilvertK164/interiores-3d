import { createClickGuard } from '../click-guard'
import { type PropNode, type PropTarget, wallLength } from '../properties-model'
import type { CoreDeps } from './core'
import type { BridgeSnapshot, SceneLike } from './types'

export type EditDeps = {
  /** `commitParametricNodeFields` de Pascal (editor): aplica el cambio con los ganchos de cada tipo y lo deja en el historial. */
  commitFields(id: string, patch: Record<string, unknown>): void
  /** Clona el elemento con lo que cuelga de él (ids nuevos, un solo paso del historial), aplica `rootPatch` a la copia y devuelve su id. */
  duplicateNode(input: { id: string; rootPatch: Record<string, unknown> }): string | null
  /** `deleteNodes` de Pascal: borra los elementos y todo lo que cuelga de ellos. */
  deleteNodes(ids: string[]): void
}

/** Cuántos elementos cuelgan de `id`, contando los de más abajo (se borran con él). */
function countDescendants(nodes: SceneLike['nodes'], id: string): number {
  const seen = new Set<string>([id])
  const queue = [...(nodes[id]?.children ?? [])]
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    if (seen.has(next) || !nodes[next]) continue
    seen.add(next)
    queue.push(...(nodes[next]?.children ?? []))
  }
  return seen.size - 1
}

/** El elemento que muestra el panel de propiedades: el ambiente elegido o el único elemento elegido. `null` si no hay (o ya no existe). */
export function selectEditTarget(s: BridgeSnapshot): PropTarget | null {
  if (s.scene.readOnly) return null
  const { zoneId, selectedIds } = s.viewer.selection
  const id = zoneId ?? (selectedIds.length === 1 ? (selectedIds[0] ?? null) : null)
  const node = id ? (s.scene.nodes[id] as PropNode | undefined) : undefined
  if (!node) return null
  const hostId = typeof node.wallId === 'string' ? node.wallId : null
  const host = hostId ? (s.scene.nodes[hostId] as PropNode | undefined) : undefined
  return {
    node,
    hostLength: host?.type === 'wall' ? wallLength(host) : null,
    descendants: countDescendants(s.scene.nodes, node.id),
  }
}

export function createEditSlice(deps: CoreDeps & EditDeps) {
  const allowDuplicate = createClickGuard()
  const node = (id: string) => deps.scene.getState().nodes[id]
  const editable = (id: string) => !deps.scene.getState().readOnly && node(id) !== undefined
  const clearSelection = () => deps.viewer.getState().setSelection({ selectedIds: [], zoneId: null })
  return {
    /** Cambia campos de un elemento (queda en el historial de Pascal). En Ver, o si el elemento ya no existe, no hace nada. */
    commit(id: string, patch: Record<string, unknown>): void {
      if (editable(id)) deps.commitFields(id, patch)
    },
    /** Duplica el elemento (con lo que cuelga de él) aplicando `rootPatch` a la copia y la deja elegida. Un doble clic crea una sola. */
    duplicate(id: string, rootPatch: Record<string, unknown>): string | null {
      if (!editable(id) || !allowDuplicate()) return null
      const isZone = node(id)?.type === 'zone'
      const copyId = deps.duplicateNode({ id, rootPatch })
      if (!copyId) return null
      deps.viewer.getState().setSelection(isZone ? { selectedIds: [], zoneId: copyId } : { selectedIds: [copyId], zoneId: null })
      return copyId
    },
    /** Borra el elemento con todo lo que cuelga de él y cierra el panel. En Ver, o si ya no existe, no hace nada. */
    remove(id: string): void {
      if (!editable(id)) return
      deps.deleteNodes([id])
      clearSelection()
    },
    /** Cierra el panel de propiedades (deja la selección vacía). */
    clearSelection,
  }
}
