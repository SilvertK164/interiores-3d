import type { SceneGraph } from '@interiores/contract'
import {
  BuildingNode,
  CeilingNode,
  DoorNode,
  ItemNode,
  LevelNode,
  MATERIAL_CATALOG,
  SiteNode,
  SlabNode,
  StairNode,
  WALL_CROWN_DEFAULT,
  WALL_SKIRTING_DEFAULT,
  WallNode,
  WindowNode,
  ZoneNode,
} from '@pascal-app/core'
import type { LevelDef, OpeningDef, TemplateDefinition } from '../../lib/templates/types'
import { validateDefinition } from '../../lib/templates/validate'

export type AssetLike = {
  id: string
  category: string
  name: string
  tags?: string[]
  src: string
  thumbnail?: string
  dimensions: number[]
  offset?: number[]
  rotation?: number[]
  scale?: number[]
  attachTo?: string
}

/** Ids de la biblioteca de materiales de Pascal (la definición los escribe sin el prefijo `library:`). */
export const MATERIAL_IDS: ReadonlySet<string> = new Set(MATERIAL_CATALOG.map((m) => m.id))

const WALL_THICKNESS = 0.2
const FLOOR_Y = 0.05 // la losa de Pascal tiene 5 cm de espesor
const FALLBACK_THUMBNAIL = '/icons/couch.webp'
const DOOR_HEIGHT = 2.1
const WINDOW_HEIGHT = 1.2
const WINDOW_SILL = 0.9

const clean = (s: string) => s.replace(/[^a-z0-9]/g, '_')
const lib = (id: string) => `library:${id}`

/**
 * Convierte una definición de plantilla en el grafo de escena de Pascal usando los esquemas reales de
 * `@pascal-app/core` (así se completan los valores por defecto). Es determinista: los ids salen de la definición.
 */
export function buildScene(def: TemplateDefinition, assets: ReadonlyMap<string, AssetLike>): SceneGraph {
  const errors = validateDefinition(def, new Set(assets.keys()), MATERIAL_IDS)
  if (errors.length > 0) throw new Error(`La plantilla ${def.id} no es válida:\n- ${errors.join('\n- ')}`)

  const tag = clean(def.id)
  const siteId = `site_${tag}`
  const buildingId = `building_${tag}`
  const levelNodeId = (level: LevelDef) => `level_${tag}_${clean(level.id)}`
  const sub = (type: string, level: LevelDef, id: string | number) => `${type}_${tag}_${clean(level.id)}_${clean(String(id))}`
  const nodes: Record<string, unknown> = {}

  def.levels.forEach((level, index) => {
    const lid = levelNodeId(level)
    const wallId = (id: string) => sub('wall', level, id)
    const openingId = (o: OpeningDef) => sub(o.type, level, o.id)
    const children: string[] = []

    const openingsByWall = new Map<string, string[]>()
    for (const o of level.openings) openingsByWall.set(o.wall, [...(openingsByWall.get(o.wall) ?? []), openingId(o)])

    for (const w of level.walls) {
      const inside = w.inside ?? level.wallInside
      const outside = w.outside ?? level.wallOutside
      nodes[wallId(w.id)] = WallNode.parse({
        id: wallId(w.id),
        parentId: lid,
        name: w.name ?? `Muro ${w.id}`,
        start: w.from,
        end: w.to,
        thickness: WALL_THICKNESS,
        children: openingsByWall.get(w.id) ?? [],
        ...(w.height ? { height: w.height } : {}),
        ...(inside ? { interiorMaterialPreset: lib(inside) } : {}),
        ...(outside ? { exteriorMaterialPreset: lib(outside) } : {}),
        ...(level.trim && !w.height
          ? {
              skirting: { ...WALL_SKIRTING_DEFAULT, enabled: true, sides: 'interior' },
              crown: { ...WALL_CROWN_DEFAULT, enabled: true, sides: 'interior' },
            }
          : {}),
      })
      children.push(wallId(w.id))
    }

    for (const o of level.openings) {
      const wid = wallId(o.wall)
      const height = o.height ?? (o.type === 'door' ? DOOR_HEIGHT : WINDOW_HEIGHT)
      const y = o.type === 'door' ? height / 2 : (o.sill ?? WINDOW_SILL) + height / 2
      const common = { id: openingId(o), parentId: wid, wallId: wid, name: o.name ?? o.id, position: [o.at, y, 0], width: o.width, height, side: 'front' }
      nodes[openingId(o)] = o.type === 'door' ? DoorNode.parse(common) : WindowNode.parse(common)
    }

    for (const r of level.rooms) {
      const [x0, z0, x1, z1] = r.rect
      const polygon = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
      const zoneId = sub('zone', level, r.id)
      const slabId = sub('slab', level, r.id)
      nodes[zoneId] = ZoneNode.parse({ id: zoneId, parentId: lid, name: r.name, polygon, color: r.color })
      nodes[slabId] = SlabNode.parse({ id: slabId, parentId: lid, name: `${r.name} (losa)`, polygon, ...(r.floor ? { materialPreset: lib(r.floor) } : {}) })
      children.push(zoneId, slabId)
      if (r.ceiling !== null) {
        const ceilingId = sub('ceiling', level, r.id)
        nodes[ceilingId] = CeilingNode.parse({ id: ceilingId, parentId: lid, name: `${r.name} (cielo)`, polygon, ...(r.ceiling ? { materialPreset: lib(r.ceiling) } : {}) })
        children.push(ceilingId)
      }
    }

    level.items.forEach((it, i) => {
      const asset = assets.get(it.asset) as AssetLike
      const id = sub('item', level, i + 1)
      nodes[id] = ItemNode.parse({
        id,
        parentId: lid,
        name: asset.name,
        position: [it.at[0], it.y ?? FLOOR_Y, it.at[1]],
        rotation: [0, it.rotY ?? 0, 0],
        asset: {
          ...asset,
          tags: asset.tags ?? [],
          thumbnail: asset.thumbnail ?? FALLBACK_THUMBNAIL,
          offset: asset.offset ?? [0, 0, 0],
          rotation: asset.rotation ?? [0, 0, 0],
          scale: asset.scale ?? [1, 1, 1],
          source: 'library',
        },
      })
      children.push(id)
    })

    for (const s of level.stairs ?? []) {
      const id = sub('stair', level, s.id)
      const target = def.levels.find((l) => l.id === s.to) as LevelDef
      nodes[id] = StairNode.parse({
        id,
        parentId: lid,
        position: [s.at[0], 0, s.at[1]],
        rotation: s.rotY,
        fromLevelId: lid,
        toLevelId: levelNodeId(target),
        width: s.width,
        stepCount: s.steps,
        slabOpeningMode: 'destination',
        railingMode: s.rail ?? 'both',
      })
      children.push(id)
    }

    nodes[lid] = LevelNode.parse({ id: lid, parentId: buildingId, level: index, children, ...(level.height ? { height: level.height } : {}) })
  })

  nodes[buildingId] = BuildingNode.parse({ id: buildingId, parentId: siteId, children: def.levels.map(levelNodeId) })
  nodes[siteId] = SiteNode.parse({
    id: siteId,
    parentId: null,
    children: [buildingId],
    polygon: { type: 'polygon', points: [[-15, -15], [15, -15], [15, 15], [-15, 15]] },
  })

  return { nodes, rootNodeIds: [siteId], collections: {}, materials: {}, installedPlugins: [] } as SceneGraph
}
