import * as Core from '@pascal-app/core'
import { CARPET_ASSETS, carpetsFirst } from './carpet-order'

type ItemLike = { type: string; asset?: { id?: string }; parentId?: string | null }

/**
 * Cuando se coloca una alfombra (la herramienta de Pascal la agrega al final de `children` de la planta), pasa al principio para que
 * el plano 2D la dibuje debajo de lo demás. Va dentro del mismo paso del historial: Deshacer quita la alfombra de una vez.
 * Devuelve cómo dejar de vigilar.
 */
export function keepCarpetsUnder(): () => void {
  return Core.useScene.subscribe((state, previous) => {
    if (state.nodes === previous.nodes) return
    const levels = new Set<string>()
    for (const node of Object.values(state.nodes) as (ItemLike & { id: string })[]) {
      if (node.type === 'item' && CARPET_ASSETS.has(node.asset?.id ?? '') && !previous.nodes[node.id as Core.AnyNodeId] && node.parentId) levels.add(node.parentId)
    }
    if (levels.size === 0) return
    const history = Core.useScene.temporal.getState()
    history.pause()
    try {
      for (const levelId of levels) {
        const level = state.nodes[levelId as Core.AnyNodeId] as { children?: string[] } | undefined
        const ordered = level?.children
          ? carpetsFirst(level.children, (id) => CARPET_ASSETS.has((state.nodes[id as Core.AnyNodeId] as ItemLike | undefined)?.asset?.id ?? ''))
          : null
        if (ordered) state.updateNode(levelId as Core.AnyNodeId, { children: ordered } as never)
      }
    } finally {
      history.resume()
    }
  })
}
