import { levelDisplayName, zoneDisplayName } from '@/lib/editor-names'
import { createClickGuard } from '../click-guard'
import type { CoreDeps } from './core'
import type { BridgeSnapshot, SceneLike, SceneNodeLike, ViewerLike } from './types'

type LevelNodeLike = SceneNodeLike & { level: number; name?: string | null }
type ZoneNodeLike = SceneNodeLike & { name?: string | null; polygon?: readonly (readonly [number, number])[] }

export type LevelsDeps = {
  /** `LevelNode.parse` + `createNode` de Pascal: crea la planta dentro del edificio y devuelve su id. */
  createLevel(input: { buildingId: string; level: number }): string
}

/** Edificio de la selección (o el primero) y sus plantas ordenadas por índice, como el selector de planta de Pascal. */
export function levelsOf(scene: SceneLike, viewer: ViewerLike): { buildingId: string | null; levels: LevelNodeLike[] } {
  const { nodes } = scene
  const picked = viewer.selection.buildingId ? nodes[viewer.selection.buildingId] : undefined
  const building = picked?.type === 'building' ? picked : Object.values(nodes).find((n) => n.type === 'building')
  if (!building) return { buildingId: null, levels: [] }
  const levels = (building.children ?? [])
    .map((id) => nodes[id])
    .filter((n): n is SceneNodeLike => n?.type === 'level') as LevelNodeLike[]
  return { buildingId: building.id, levels: [...levels].sort((a, b) => a.level - b.level) }
}

/** Superficie con la fórmula del polígono (la misma de `footprintArea` en `deriveZoneQuantityReport`, sin su detección de recintos). */
export function shoelaceArea(polygon: readonly (readonly [number, number])[]): number {
  let twice = 0
  polygon.forEach((start, index) => {
    const end = polygon[(index + 1) % polygon.length] as readonly [number, number]
    twice += start[0] * end[1] - end[0] * start[1]
  })
  return Math.abs(twice) / 2
}

export function selectLevels(s: BridgeSnapshot): { levels: { id: string; name: string }[]; activeId: string | null } {
  const { levels } = levelsOf(s.scene, s.viewer)
  const activeId = levels.some((l) => l.id === s.viewer.selection.levelId) ? s.viewer.selection.levelId : null
  return { levels: levels.map((l) => ({ id: l.id, name: levelDisplayName(l) })), activeId }
}

export function selectZones(s: BridgeSnapshot): {
  zones: { id: string; name: string; area: number }[]
  selectedId: string | null
} {
  const active = levelsOf(s.scene, s.viewer).levels.find((l) => l.id === s.viewer.selection.levelId)
  const zones = (active?.children ?? [])
    .map((id) => s.scene.nodes[id])
    .filter((n): n is SceneNodeLike => n?.type === 'zone')
    .map((n) => {
      const zone = n as ZoneNodeLike
      return { id: zone.id, name: zoneDisplayName(zone.name), area: shoelaceArea(zone.polygon ?? []) }
    })
  return { zones, selectedId: s.viewer.selection.zoneId }
}

export function createLevelsSlice(deps: CoreDeps & LevelsDeps) {
  const allowAdd = createClickGuard()
  const current = () => levelsOf(deps.scene.getState(), deps.viewer.getState())
  return {
    selectLevel(id: string): void {
      const { buildingId } = current()
      deps.viewer.getState().setSelection(buildingId ? { buildingId, levelId: id } : { levelId: id })
    },
    /** Agrega una planta sobre la más alta (como "Add level above" de Pascal) y la deja activa. En Ver no hace nada. */
    addLevel(): string | null {
      if (deps.scene.getState().readOnly || !allowAdd()) return null
      const { buildingId, levels } = current()
      if (!buildingId) return null
      const level = levels.length > 0 ? Math.max(...levels.map((l) => l.level)) + 1 : 0
      const id = deps.createLevel({ buildingId, level })
      deps.viewer.getState().setSelection({ buildingId, levelId: id })
      return id
    },
    /** Elegir un ambiente de la lista lo selecciona (en Ver no hay selección). */
    selectZone(id: string): void {
      if (deps.scene.getState().readOnly) return
      if (deps.editor.getState().mode !== 'select') deps.editor.getState().armToolMode({ mode: 'select' })
      deps.viewer.getState().setSelection({ selectedIds: [], zoneId: id })
    },
  }
}
