import { createClickGuard } from '../click-guard'
import { metersPatch } from '../properties-units'
import type { CoreDeps } from './core'
import { levelsOf } from './levels'
import type { BridgeSnapshot, SceneLike, SceneNodeLike } from './types'

/** Altura de planta (piso a piso, en metros) que se admite: Pascal no fija límites; estos cubren de un sótano bajo a un doble alto. */
export const LEVEL_HEIGHT_LIMITS = [2, 6] as const
/** La altura que Pascal asume si la planta no la trae (`DEFAULT_LEVEL_HEIGHT` de core). */
const DEFAULT_HEIGHT = 2.5
export const LEVEL_NAME_MAX = 40

export type LevelsManageDeps = {
  /** `updateNodes` de Pascal: los cambios de varias plantas entran al historial como un solo paso. */
  updateLevels(patches: { id: string; data: Record<string, unknown> }[]): void
  /** Copia la planta (ambientes, muros, aberturas y muebles con ids nuevos) sobre la original; devuelve la nueva o `null`. */
  duplicateLevel(id: string): string | null
  /** Borra la planta con todo lo que tiene y deja las escaleras de otras plantas sin referencias rotas, todo en un paso. */
  deleteLevel(id: string): void
}

type StairLike = SceneNodeLike & { fromLevelId?: string | null; toLevelId?: string | null }

export type LevelInfo = {
  id: string
  height: number
  /** Ambientes y demás elementos (muros, aberturas, muebles, escaleras...) que se pierden al borrar la planta. */
  zones: number
  elements: number
  canDelete: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}

function descendants(nodes: SceneLike['nodes'], id: string, seen = new Set<string>()): SceneNodeLike[] {
  const node = nodes[id]
  const out: SceneNodeLike[] = []
  for (const childId of node?.children ?? []) {
    const child = nodes[childId]
    if (!child || seen.has(childId)) continue
    seen.add(childId)
    out.push(child, ...descendants(nodes, childId, seen))
  }
  return out
}

export function selectLevelInfo(s: BridgeSnapshot): LevelInfo[] {
  const { levels } = levelsOf(s.scene, s.viewer)
  return levels.map((level, index) => {
    const below = descendants(s.scene.nodes, level.id)
    const zones = below.filter((n) => n.type === 'zone').length
    return {
      id: level.id,
      height: (level as SceneNodeLike & { height?: number }).height ?? DEFAULT_HEIGHT,
      zones,
      elements: below.length - zones,
      canDelete: levels.length > 1,
      canMoveUp: index < levels.length - 1,
      canMoveDown: index > 0,
    }
  })
}

/** Escaleras que ya no suben de una planta a la inmediata de arriba (por mover plantas de orden). */
function brokenStairs(scene: SceneLike, levelIndexes: Map<string, number>): number {
  return Object.values(scene.nodes).filter((n): n is StairLike => {
    if (n.type !== 'stair') return false
    const stair = n as StairLike
    const from = stair.fromLevelId ? levelIndexes.get(stair.fromLevelId) : undefined
    const to = stair.toLevelId ? levelIndexes.get(stair.toLevelId) : undefined
    if (from === undefined || to === undefined) return false
    const ordered = [...levelIndexes.values()].sort((a, b) => a - b)
    return ordered.indexOf(to) !== ordered.indexOf(from) + 1
  }).length
}

export function createLevelManageSlice(deps: CoreDeps & LevelsManageDeps) {
  const guardDuplicate = createClickGuard()
  const guardDelete = createClickGuard()
  const editable = () => !deps.scene.getState().readOnly
  const current = () => levelsOf(deps.scene.getState(), deps.viewer.getState())
  return {
    /** Renombra la planta (sin espacios sobrantes, hasta 40 letras). `false` si el nombre queda vacío o estás en Ver. */
    renameLevel(id: string, raw: string): boolean {
      const name = raw.trim().slice(0, LEVEL_NAME_MAX).trim()
      if (!editable() || name === '') return false
      deps.updateLevels([{ id, data: { name } }])
      return true
    },
    /** Cambia la altura piso a piso (en metros, con coma o punto); Pascal reajusta escaleras y cielorrasos. */
    setLevelHeight(id: string, raw: string): boolean {
      if (!editable()) return false
      const level = selectLevelInfo({
        editor: deps.editor.getState(),
        viewer: deps.viewer.getState(),
        scene: deps.scene.getState(),
        history: deps.history.read(),
      }).find((l) => l.id === id)
      if (!level) return false
      const next = metersPatch(raw, LEVEL_HEIGHT_LIMITS, level.height)
      if (next === null) return false
      deps.updateLevels([{ id, data: { height: next } }])
      return true
    },
    /** Intercambia el orden con la vecina (como arrastrar en el selector de plantas de Pascal); cuenta las escaleras que quedan mal. */
    moveLevel(id: string, direction: 'up' | 'down'): { moved: boolean; brokenStairs: number } {
      const { levels } = current()
      const index = levels.findIndex((l) => l.id === id)
      const other = levels[direction === 'up' ? index + 1 : index - 1]
      const mine = levels[index]
      if (!editable() || !mine || !other) return { moved: false, brokenStairs: 0 }
      deps.updateLevels([
        { id: mine.id, data: { level: other.level } },
        { id: other.id, data: { level: mine.level } },
      ])
      const swapped = new Map(levels.map((l) => [l.id, l.level]))
      swapped.set(mine.id, other.level)
      swapped.set(other.id, mine.level)
      return { moved: true, brokenStairs: brokenStairs(deps.scene.getState(), swapped) }
    },
    /** Borra la planta (nunca la última). Deshacer la restaura completa. Un segundo clic seguido no hace nada. */
    deleteLevel(id: string): boolean {
      const { levels } = current()
      if (!editable() || levels.length < 2 || !levels.some((l) => l.id === id) || !guardDelete()) return false
      deps.deleteLevel(id)
      return true
    },
    /** Copia la planta sobre la original y la deja activa. Un doble clic crea una sola copia. */
    duplicateLevel(id: string): string | null {
      if (!editable() || !guardDuplicate() || !current().levels.some((l) => l.id === id)) return null
      const copy = deps.duplicateLevel(id)
      if (copy) deps.viewer.getState().setSelection({ levelId: copy })
      return copy
    },
  }
}
