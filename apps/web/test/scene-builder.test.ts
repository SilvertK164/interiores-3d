import { SceneEnvelopeSchema } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { MATERIAL_IDS, buildScene } from '../src/editor/templates/scene-builder'
import { perimeter } from '../src/lib/templates/geometry'
import type { TemplateDefinition } from '../src/lib/templates/types'

const asset = (id: string, name: string, extra: object = {}) => ({
  id,
  category: 'furniture',
  name,
  tags: ['comercio'],
  src: `/items/${id}/model.glb`,
  thumbnail: `/items/${id}/thumbnail.png`,
  dimensions: [1, 1, 1],
  offset: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  ...extra,
})
const ASSETS = new Map([
  ['cash-register', asset('cash-register', 'Caja registradora')],
  ['sofa', asset('sofa', 'Sofá')],
])

const def: TemplateDefinition = {
  id: 'local-de-prueba',
  kind: 'comercio',
  name: 'Local de prueba',
  summary: 'Dos niveles',
  levels: [
    {
      id: 'pb',
      height: 3.4,
      wallInside: 'concrete-plaster',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 8, 4).map((w) => (w.id === 'p-n' ? { ...w, inside: 'flooring-rusticbrick' } : w)),
        { id: 'int', from: [5, 0], to: [5, 4] },
      ],
      rooms: [
        { id: 'salon', name: 'Salón', color: '#1F5FE0', rect: [0, 0, 5, 4], floor: 'wood-hungarianparquet10', ceiling: 'concrete-plaster' },
        { id: 'terraza', name: 'Terraza', color: '#1FA971', rect: [5, 0, 8, 4], floor: 'flooring-terrazzo19', ceiling: null },
      ],
      openings: [
        { id: 'entrada', type: 'door', wall: 'p-s', at: 2, width: 1 },
        { id: 'vidriera', type: 'window', wall: 'p-s', at: 3.8, width: 1.4, sill: 0.5 },
        { id: 'interior', type: 'door', wall: 'int', at: 2, width: 0.9 },
      ],
      items: [
        { asset: 'cash-register', at: [1, 1], rotY: Math.PI },
        { asset: 'cash-register', at: [2, 1], y: 0.78 },
      ],
      shelves: [{ id: 'gondola', style: 'open-rack', at: [2.5, 3.5], width: 1.5, depth: 0.5, height: 1.8, rows: 5, withBack: true, material: 'preset-charcoal' }],
      cabinets: [
        {
          id: 'mostrador',
          at: [3, 0.5],
          depth: 0.7,
          height: 0.8,
          bar: true,
          modules: [
            { width: 1.2, stack: [{ type: 'door', doorType: 'double' }] },
            { width: 0.6, stack: [{ type: 'drawer', drawerCount: 3 }] },
          ],
        },
        {
          id: 'vitrina',
          at: [0.5, 1.5],
          rotY: Math.PI / 2,
          depth: 0.5,
          height: 1.9,
          tier: 'tall',
          modules: [{ width: 1, stack: [{ type: 'door', doorType: 'glass', shelfCount: 4 }] }],
        },
      ],
      stairs: [{ id: 'escalera', at: [1, 3], rotY: 0, width: 1.1, steps: 14, to: 'alta', rail: 'both' }],
    },
    {
      id: 'alta',
      height: 2.8,
      trim: true,
      walls: [...perimeter('a', 5, 0, 8, 4), { id: 'baranda', from: [5, 0], to: [5, 2], height: 1.05 }],
      rooms: [{ id: 'showroom', name: 'Showroom', color: '#7A8AA8', rect: [5, 0, 8, 4], floor: 'wood-woodfine22', open: ['w'] }],
      openings: [],
      items: [{ asset: 'sofa', at: [6, 2] }],
    },
  ],
}

type N = { id: string; type: string; parentId: string | null; children?: string[] } & Record<string, unknown>
const graph = buildScene(def, ASSETS)
const nodes = graph.nodes as Record<string, N>
const byType = (type: string) => Object.values(nodes).filter((n) => n.type === type)

describe('buildScene', () => {
  it('crea sitio, edificio, dos niveles y la cantidad esperada de nodos', () => {
    expect(byType('site')).toHaveLength(1)
    expect(byType('building')).toHaveLength(1)
    expect(byType('level')).toHaveLength(2)
    expect(byType('wall')).toHaveLength(10)
    expect(byType('zone')).toHaveLength(3)
    expect(byType('slab')).toHaveLength(3)
    expect(byType('ceiling')).toHaveLength(2) // la terraza (`ceiling: null`) no lleva cielo
    expect(byType('door')).toHaveLength(2)
    expect(byType('window')).toHaveLength(1)
    expect(byType('item')).toHaveLength(3)
    expect(byType('stair')).toHaveLength(1)
    expect(graph.rootNodeIds).toHaveLength(1)
  })

  it('los niveles tienen su índice y su altura, y el edificio los lista en orden', () => {
    const levels = byType('level').sort((a, b) => (a.level as number) - (b.level as number))
    expect(levels.map((l) => l.level)).toEqual([0, 1])
    expect(levels.map((l) => l.height)).toEqual([3.4, 2.8])
    expect(byType('building')[0]?.children).toEqual(levels.map((l) => l.id))
  })

  it('cada nodo apunta a un padre que existe y cada padre lista a sus hijos', () => {
    for (const n of Object.values(nodes)) {
      if (!n.parentId) continue
      expect(nodes[n.parentId], `${n.id} → ${n.parentId}`).toBeDefined()
      if (nodes[n.parentId]?.children) expect(nodes[n.parentId]?.children, n.id).toContain(n.id)
    }
  })

  it('las puertas y ventanas cuelgan de su muro y el muro las lista', () => {
    const openings = [...byType('door'), ...byType('window')]
    expect(openings).toHaveLength(3)
    for (const o of openings) {
      expect(nodes[o.parentId as string]?.type).toBe('wall')
      expect(o.wallId).toBe(o.parentId)
      expect(nodes[o.parentId as string]?.children).toContain(o.id)
    }
  })

  it('aplica los materiales de la biblioteca con el prefijo library: (piso, cielo y lados del muro)', () => {
    const slab = byType('slab').find((s) => s.name === 'Salón (losa)')
    expect(slab?.materialPreset).toBe('library:wood-hungarianparquet10')
    expect(byType('ceiling')[0]?.materialPreset).toBe('library:concrete-plaster')
    const north = nodes['wall_local_de_prueba_pb_p_n'] as N
    expect(north.interiorMaterialPreset).toBe('library:flooring-rusticbrick')
    expect(north.exteriorMaterialPreset).toBe('library:flooring-agedbrick')
    const partition = nodes['wall_local_de_prueba_pb_int'] as N
    expect(partition.interiorMaterialPreset).toBe('library:concrete-plaster')
  })

  it('activa zócalo y cornisa si el nivel lo pide, salvo en parapetos y barandas, y respeta el alto del muro', () => {
    const north = nodes['wall_local_de_prueba_pb_p_n'] as N
    expect((north.skirting as { enabled: boolean }).enabled).toBe(true)
    expect((north.crown as { enabled: boolean }).enabled).toBe(true)
    const rail = nodes['wall_local_de_prueba_alta_baranda'] as N
    expect(rail.height).toBe(1.05)
    expect((rail.skirting as { enabled?: boolean } | undefined)?.enabled ?? false).toBe(false)
    expect((rail.crown as { enabled?: boolean } | undefined)?.enabled ?? false).toBe(false)
    expect(((nodes['wall_local_de_prueba_alta_a_n'] as N).skirting as { enabled: boolean }).enabled).toBe(true)
  })

  it('la escalera conecta el nivel de abajo con el de arriba', () => {
    const stair = byType('stair')[0] as N
    const [ground, top] = byType('level').sort((a, b) => (a.level as number) - (b.level as number))
    expect(stair.parentId).toBe(ground?.id)
    expect(stair.fromLevelId).toBe(ground?.id)
    expect(stair.toLevelId).toBe(top?.id)
    expect(stair.stepCount).toBe(14)
    expect(stair.railingMode).toBe('both')
  })

  it('crea los estantes y los gabinetes paramétricos de Pascal', () => {
    expect(byType('shelf')).toHaveLength(1)
    expect(byType('cabinet')).toHaveLength(2)
    expect(byType('cabinet-module')).toHaveLength(3)
  })

  it('el estante lleva su estilo, sus medidas, su material y su posición sobre la losa', () => {
    const shelf = nodes['shelf_local_de_prueba_pb_gondola'] as N
    expect(shelf).toMatchObject({
      style: 'open-rack',
      rows: 5,
      width: 1.5,
      depth: 0.5,
      height: 1.8,
      withBack: true,
      materialPreset: 'library:preset-charcoal',
      position: [2.5, 0.05, 3.5],
    })
  })

  it('la corrida suma el ancho de sus módulos y los ubica centrados en fila sobre su eje x', () => {
    const run = nodes['cabinet_local_de_prueba_pb_mostrador'] as N
    expect(run).toMatchObject({ width: 1.8, runTier: 'base', withCountertop: true, position: [3, 0.05, 0.5] })
    expect((run.barLedge as { edge: string }).edge).toBe('back')
    const modules = (run.children as string[]).map((id) => nodes[id] as N)
    expect(modules.map((m) => m.position)).toEqual([[-0.3, 0, 0], [0.6, 0, 0]])
    expect(modules.map((m) => m.width)).toEqual([1.2, 0.6])
    expect(modules.every((m) => m.parentId === run.id)).toBe(true)
  })

  it('una vitrina alta no lleva mesada, queda girada y tiene la puerta de vidrio con sus estantes', () => {
    const run = nodes['cabinet_local_de_prueba_pb_vitrina'] as N
    expect(run).toMatchObject({ runTier: 'tall', withCountertop: false, rotation: Math.PI / 2 })
    const module = nodes[(run.children as string[])[0] as string] as N
    expect(module).toMatchObject({ cabinetType: 'tall', withCountertop: false })
    expect(module.stack).toEqual([expect.objectContaining({ type: 'door', doorType: 'glass', shelfCount: 4 })])
  })

  it('las piezas llevan su descriptor, su altura sobre la losa y su giro', () => {
    const [a, b] = byType('item').filter((i) => (i.asset as { id: string }).id === 'cash-register') as [N, N]
    expect((a.asset as { src: string }).src).toBe('/items/cash-register/model.glb')
    expect(a.position).toEqual([1, 0.05, 1])
    expect((a.rotation as number[])[1]).toBeCloseTo(Math.PI)
    expect(b.position).toEqual([2, 0.78, 1])
  })

  it('es determinista y cabe en un SceneEnvelope válido de mucho menos de 5 MB', () => {
    expect(JSON.stringify(buildScene(def, ASSETS))).toBe(JSON.stringify(graph))
    const envelope = { schemaVersion: 1, pascal: { core: '1.0.3' }, graph }
    expect(SceneEnvelopeSchema.safeParse(envelope).success).toBe(true)
    expect(JSON.stringify(envelope).length).toBeLessThan(300_000)
  })

  it('la biblioteca de materiales de Pascal está disponible para validar', () => {
    expect(MATERIAL_IDS.has('wood-hungarianparquet10')).toBe(true)
    expect(MATERIAL_IDS.has('concrete-plaster')).toBe(true)
    expect(MATERIAL_IDS.size).toBeGreaterThan(100)
  })

  it('se niega a construir una definición inválida y explica por qué', () => {
    const bad = structuredClone(def)
    bad.levels[0]!.walls = bad.levels[0]!.walls.filter((w) => w.id !== 'int')
    expect(() => buildScene(bad, ASSETS)).toThrow('no cierra')
    const badMaterial = structuredClone(def)
    badMaterial.levels[0]!.wallInside = 'no-es-un-material'
    expect(() => buildScene(badMaterial, ASSETS)).toThrow('no-es-un-material')
  })
})
