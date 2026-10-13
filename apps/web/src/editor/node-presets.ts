import * as Core from '@pascal-app/core'
import * as Pascal from '@pascal-app/editor'
import type { PresetsDeps } from './shell/bridge/presets'

type NodeType = 'shelf' | 'stair'

/**
 * Completa los estantes y escaleras que crea la herramienta de Pascal (que siempre arma el mismo nodo) con el parche del preset.
 * Se aplica dentro de la misma notificación de `createNode` y con el historial en pausa: Deshacer quita el nodo entero de una vez.
 * Se edita con `commitParametricNodeFields`, la misma rutina del inspector (aplica `derive` y `reconcile` del registro).
 */
export function nodePresets(): PresetsDeps {
  let pending: { type: NodeType; patch: Record<string, unknown> } | null = null
  let known = new Set<string>()
  let stop: (() => void) | null = null
  const idsOf = (type: NodeType) => Object.values(Core.useScene.getState().nodes).filter((n) => n.type === type).map((n) => n.id as string)
  const apply = () => {
    if (!pending) return
    const { type, patch } = pending
    const fresh = idsOf(type).filter((id) => !known.has(id))
    if (fresh.length === 0) return
    known = new Set(idsOf(type))
    const history = Core.useScene.temporal.getState()
    history.pause()
    try {
      for (const id of fresh) Pascal.commitParametricNodeFields(id as Core.AnyNodeId, patch as Partial<Core.AnyNode>)
    } finally {
      history.resume()
    }
  }
  return {
    armNodePatch(type, patch) {
      pending = { type, patch }
      known = new Set(idsOf(type))
      stop ??= Core.useScene.subscribe(apply)
    },
    clearNodePatch() {
      pending = null
      stop?.()
      stop = null
    },
  }
}
