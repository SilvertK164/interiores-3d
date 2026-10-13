import { WallNode, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'

type SceneNode = { id: string; type: string }

/** Solo para Playwright: lee y modifica la escena sin depender de píxeles. */
export function installE2eHooks(): void {
  const nodes = () => Object.values(useScene.getState().nodes) as SceneNode[]
  ;(window as unknown as { __e2e: unknown }).__e2e = {
    ready: () => nodes().some((n) => n.type === 'level'),
    counts: () => {
      const total: Record<string, number> = {}
      for (const n of nodes()) total[n.type] = (total[n.type] ?? 0) + 1
      return total
    },
    /** Solo para las capturas de las plantillas: 'up' | 'cutaway' | 'down' | 'translucent'. */
    setWallMode: (mode: string) => useViewer.getState().setWallMode(mode as never),
    wallCount: () => nodes().filter((n) => n.type === 'wall').length,
    addWall: () => {
      const level = nodes().find((n) => n.type === 'level')
      if (!level) throw new Error('No hay nivel donde agregar el muro')
      useScene.getState().createNode(WallNode.parse({ start: [0, 0], end: [4, 0] }), level.id as never)
    },
  }
}
