import type { SceneGraph } from '@interiores/contract'
import {
  BuildingNode,
  CabinetModuleNode,
  CabinetNode,
  CeilingNode,
  DoorNode,
  ItemNode,
  LevelNode,
  MATERIAL_CATALOG,
  ShelfNode,
  SiteNode,
  SlabNode,
  StairNode,
  StairSegmentNode,
  WALL_CROWN_DEFAULT,
  WALL_SKIRTING_DEFAULT,
  WallNode,
  WindowNode,
  ZoneNode,
} from '@pascal-app/core'
import { DEFAULT_LEVEL_HEIGHT, DEFAULT_STAIR_RUN, DOOR_HEIGHT, WINDOW_HEIGHT, WINDOW_SILL, cabinetWidth } from '../../lib/templates/geometry'
import type { LevelDef, OpeningDef, Pt, TemplateDefinition } from '../../lib/templates/types'
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
// Pascal sube cada pieza apoyada en el piso el espesor de la losa (5 cm) al dibujarla: la posición guardada es 0.
const FLOOR_Y = 0
const FALLBACK_THUMBNAIL = '/icons/couch.webp'

const SHELF_NAMES = { 'wall-shelf': 'Repisa', bookshelf: 'Biblioteca', 'open-rack': 'Góndola', cubby: 'Exhibidor' } as const
const BAR_LEDGE = { edge: 'back', height: 1.06, depth: 0.35 } as const
const round3 = (n: number) => Math.round(n * 1000) / 1000

const clean = (s: string) => s.replace(/[^a-z0-9]/g, '_')
const lib = (id: string) => `library:${id}`

/**
 * Convierte una definición de plantilla en el grafo de escena de Pascal usando los esquemas reales de
 * `@pascal-app/core` (así se completan los valores por defecto). Es determinista: los ids salen de la definición.
 */
export function buildScene(def: TemplateDefinition, assets: ReadonlyMap<string, AssetLike>): SceneGraph {
  const errors = validateDefinition(def, new Set(assets.keys()), MATERIAL_IDS)
  if (errors.length > 0) throw new Error(`La plantilla ${def.id} no es válida:\n- ${errors.join('\n- ')}`)

  // Las definiciones usan coordenadas positivas desde la esquina (0, 0); la escena se centra en el origen,
  // que es desde donde el editor encuadra la cámara. Las aberturas se miden sobre su muro y no se mueven.
  const wallPoints = (def.levels[0] as LevelDef).walls.flatMap((w) => [w.from, w.to])
  const xs = wallPoints.map((p) => p[0])
  const zs = wallPoints.map((p) => p[1])
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
  const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2
  const at = (p: Pt): Pt => [round3(p[0] - centerX), round3(p[1] - centerZ)]

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
        start: at(w.from),
        end: at(w.to),
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
      const polygon = [at([x0, z0]), at([x1, z0]), at([x1, z1]), at([x0, z1])]
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
        position: [at(it.at)[0], it.y ?? FLOOR_Y, at(it.at)[1]],
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

    for (const sh of level.shelves ?? []) {
      const id = sub('shelf', level, sh.id)
      nodes[id] = ShelfNode.parse({
        id,
        parentId: lid,
        name: sh.name ?? SHELF_NAMES[sh.style],
        position: [at(sh.at)[0], sh.y ?? FLOOR_Y, at(sh.at)[1]],
        rotation: [0, sh.rotY ?? 0, 0],
        width: sh.width,
        depth: sh.depth,
        height: sh.height,
        style: sh.style,
        rows: sh.rows ?? 1,
        columns: sh.columns ?? 1,
        withBack: sh.withBack ?? false,
        withBottom: sh.withBottom ?? false,
        ...(sh.material ? { materialPreset: lib(sh.material) } : {}),
      })
      children.push(id)
    }

    for (const c of level.cabinets ?? []) {
      // Pascal solo dibuja una corrida si tiene módulos hijos; cada módulo se ubica por el centro de su ancho en el eje local x.
      const runId = sub('cabinet', level, c.id)
      const tier = c.tier ?? 'base'
      const countertop = c.countertop ?? tier !== 'tall'
      const total = cabinetWidth(c)
      const common = {
        depth: c.depth,
        carcassHeight: c.height,
        withCountertop: countertop,
        ...(c.frontStyle ? { frontStyle: c.frontStyle } : {}),
        ...(c.material ? { materialPreset: lib(c.material) } : {}),
      }
      let cursor = -total / 2
      const moduleIds = c.modules.map((m, i) => {
        const mid = `cabinet-module_${tag}_${clean(level.id)}_${clean(c.id)}_${i + 1}`
        nodes[mid] = CabinetModuleNode.parse({
          id: mid,
          parentId: runId,
          position: [round3(cursor + m.width / 2), 0, 0],
          width: m.width,
          cabinetType: tier,
          stack: m.stack.map((compartment, k) => ({ id: `${mid}_${k + 1}`, ...compartment })),
          ...common,
        })
        cursor += m.width
        return mid
      })
      nodes[runId] = CabinetNode.parse({
        id: runId,
        parentId: lid,
        name: c.name ?? 'Mostrador',
        position: [at(c.at)[0], c.y ?? FLOOR_Y, at(c.at)[1]],
        rotation: c.rotY ?? 0,
        runTier: tier,
        width: total,
        children: moduleIds,
        ...(c.bar ? { barLedge: BAR_LEDGE } : {}),
        ...common,
      })
      children.push(runId)
    }

    for (const s of level.stairs ?? []) {
      const id = sub('stair', level, s.id)
      const target = def.levels.find((l) => l.id === s.to) as LevelDef
      // El tramo hijo fija el recorrido; Pascal reajusta su altura a la del nivel (`syncStairRises`).
      const segmentId = `sseg_${tag}_${clean(level.id)}_${clean(s.id)}`
      nodes[segmentId] = StairSegmentNode.parse({
        id: segmentId,
        parentId: id,
        segmentType: 'stair',
        width: s.width,
        length: s.run ?? DEFAULT_STAIR_RUN,
        height: level.height ?? DEFAULT_LEVEL_HEIGHT,
        stepCount: s.steps,
      })
      nodes[id] = StairNode.parse({
        id,
        children: [segmentId],
        parentId: lid,
        position: [at(s.at)[0], 0, at(s.at)[1]],
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
