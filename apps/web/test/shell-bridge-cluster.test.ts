import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { ClusterPiece } from '../src/editor/shell/bridge/cluster'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { createFakeDeps } from './support/fake-deps'

afterEach(() => vi.useRealTimers())

const nodes = (list: Record<string, object>) => list as unknown as SceneLike['nodes']

// Un edificio de dos plantas. La baja tiene cuatro muros (de 0,0 a 6,4: centro 3, 2), una sala de 4 x 3 en la esquina (centro 2, 1,5) y
// una cocina en L; la de arriba, un ambiente desplazado y la planta vacía "level_c" no tiene nada.
const SCENE = nodes({
  site_1: { id: 'site_1', type: 'site', children: ['building_1'] },
  building_1: { id: 'building_1', type: 'building', children: ['level_a', 'level_b', 'level_c'] },
  level_a: {
    id: 'level_a',
    type: 'level',
    level: 0,
    children: ['wall_n', 'wall_e', 'wall_s', 'wall_w', 'zone_sala', 'zone_l', 'zone_punto'],
  },
  level_b: { id: 'level_b', type: 'level', level: 1, children: ['zone_alta'] },
  level_c: { id: 'level_c', type: 'level', level: 2, children: [] },
  wall_n: { id: 'wall_n', type: 'wall', parentId: 'level_a', start: [0, 0], end: [6, 0] },
  wall_e: { id: 'wall_e', type: 'wall', parentId: 'level_a', start: [6, 0], end: [6, 4] },
  wall_s: { id: 'wall_s', type: 'wall', parentId: 'level_a', start: [6, 4], end: [0, 4] },
  wall_w: { id: 'wall_w', type: 'wall', parentId: 'level_a', start: [0, 4], end: [0, 0] },
  zone_sala: { id: 'zone_sala', type: 'zone', parentId: 'level_a', polygon: [[0, 0], [4, 0], [4, 3], [0, 3]] },
  zone_l: { id: 'zone_l', type: 'zone', parentId: 'level_a', polygon: [[0, 0], [4, 0], [4, 1], [1, 1], [1, 3], [0, 3]] },
  zone_punto: { id: 'zone_punto', type: 'zone', parentId: 'level_a', polygon: [[1, 1], [3, 1]] },
  zone_alta: { id: 'zone_alta', type: 'zone', parentId: 'level_b', polygon: [[10, 10], [12, 10], [12, 14], [10, 14]] },
})

const piece = (id: string, at: [number, number], dims: [number, number, number] | undefined, rotY = 0): ClusterPiece => ({
  asset: { id, name: id, ...(dims ? { dimensions: dims } : {}) },
  at,
  rotY,
})
const SOFA = piece('sofa', [0, 0], [2, 1, 1])
const CHAIR = piece('dining-chair', [2, 1], [1, 1, 1])

function setup(selection: { levelId?: string | null; zoneId?: string | null; selectedIds?: string[] } = {}) {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes: SCENE })
  fake.viewer.setState({
    selection: { buildingId: 'building_1', levelId: selection.levelId === undefined ? 'level_a' : selection.levelId, zoneId: selection.zoneId ?? null, selectedIds: selection.selectedIds ?? [] },
  })
  return { ...fake, bridge: createBridge(fake.deps) }
}
type Call = { parentId: string; items: { asset: { id: string }; position: [number, number, number]; rotY: number }[] }
const lastCall = (fake: ReturnType<typeof setup>) => fake.deps.insertItems.mock.calls.at(-1)?.[0] as unknown as Call

describe('bridge.cluster.insert: cuándo no hace nada', () => {
  it('en Ver (solo lectura) no crea nada ni cambia la selección', () => {
    const fake = setup()
    fake.scene.setState({ readOnly: true })
    expect(fake.bridge.cluster.insert([SOFA])).toEqual([])
    expect(fake.deps.insertItems).not.toHaveBeenCalled()
    expect(fake.viewer.getState().selection.selectedIds).toEqual([])
  })

  it('sin piezas no hace nada', () => {
    const fake = setup()
    expect(fake.bridge.cluster.insert([])).toEqual([])
    expect(fake.deps.insertItems).not.toHaveBeenCalled()
  })

  it('sin ninguna planta (escena vacía) no hace nada', () => {
    const fake = setup()
    fake.scene.setState({ nodes: nodes({}) })
    expect(fake.bridge.cluster.insert([SOFA])).toEqual([])
    expect(fake.deps.insertItems).not.toHaveBeenCalled()
  })

  it('una planta que no existe no se usa (ni se cae a otra)', () => {
    const fake = setup()
    expect(fake.bridge.cluster.insert([SOFA], 'level_borrado')).toEqual([])
    expect(fake.deps.insertItems).not.toHaveBeenCalled()
  })

  it('un doble clic inserta una sola vez', () => {
    const fake = setup()
    expect(fake.bridge.cluster.insert([SOFA])).toHaveLength(1)
    expect(fake.bridge.cluster.insert([SOFA])).toEqual([])
    expect(fake.deps.insertItems).toHaveBeenCalledTimes(1)
  })

  it('pasado un rato se puede insertar otra vez', () => {
    vi.useFakeTimers()
    const fake = setup()
    fake.bridge.cluster.insert([SOFA])
    vi.advanceTimersByTime(1000)
    expect(fake.bridge.cluster.insert([SOFA])).toHaveLength(1)
    expect(fake.deps.insertItems).toHaveBeenCalledTimes(2)
  })
})

describe('bridge.cluster.insert: todo de una vez', () => {
  it('pide crear todas las piezas en UNA sola llamada (un solo paso del historial), en su orden, en la planta activa', () => {
    const fake = setup()
    const ids = fake.bridge.cluster.insert([SOFA, CHAIR, piece('coffee-table', [0, -2], [1, 1, 1])])
    expect(fake.deps.insertItems).toHaveBeenCalledTimes(1)
    const call = lastCall(fake)
    expect(call.parentId).toBe('level_a')
    expect(call.items.map((i) => i.asset.id)).toEqual(['sofa', 'dining-chair', 'coffee-table'])
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })

  it('las piezas van sobre el piso (y = 0) y conservan su giro', () => {
    const fake = setup()
    fake.bridge.cluster.insert([piece('sofa', [0, 0], [2, 1, 1], -Math.PI / 2)])
    const [item] = lastCall(fake).items
    expect(item?.position[1]).toBe(0)
    expect(item?.rotY).toBeCloseTo(-Math.PI / 2, 12)
  })

  it('con una planta elegida por parámetro, inserta ahí y deja esa planta como la activa', () => {
    const fake = setup()
    const ids = fake.bridge.cluster.insert([SOFA], 'level_b')
    expect(lastCall(fake).parentId).toBe('level_b')
    expect(fake.viewer.getState().selection).toMatchObject({ buildingId: 'building_1', levelId: 'level_b', selectedIds: ids })
  })

  it('si no hay planta activa usa la más baja', () => {
    const fake = setup({ levelId: null })
    fake.bridge.cluster.insert([SOFA])
    expect(lastCall(fake).parentId).toBe('level_a')
  })
})

describe('bridge.cluster.insert: dónde queda el conjunto', () => {
  const centerOf = (items: Call['items'], dims: [number, number][], ) => {
    const xs = items.flatMap((it, i) => [it.position[0] - (dims[i]?.[0] ?? 1) / 2, it.position[0] + (dims[i]?.[0] ?? 1) / 2])
    const zs = items.flatMap((it, i) => [it.position[2] - (dims[i]?.[1] ?? 1) / 2, it.position[2] + (dims[i]?.[1] ?? 1) / 2])
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2]
  }

  it('con un ambiente elegido, el centro del conjunto cae en el centro de ese ambiente (la caja que envuelve a las piezas)', () => {
    const fake = setup({ zoneId: 'zone_sala' })
    fake.bridge.cluster.insert([SOFA, CHAIR])
    const { items } = lastCall(fake)
    // La caja del conjunto va de x = -1 a 2,5 y de z = -0,5 a 1,5 (centro 0,75 y 0,5): se mueve a (2; 1,5), el centro de la sala.
    expect(items[0]?.position).toEqual([1.25, 0, 1])
    expect(items[1]?.position).toEqual([3.25, 0, 2])
    expect(centerOf(items, [[2, 1], [1, 1]])).toEqual([2, 1.5])
  })

  it('el giro de cada pieza cuenta en la caja: una pieza girada un cuarto de vuelta ocupa su ancho a lo largo del eje z', () => {
    const fake = setup({ zoneId: 'zone_sala' })
    // A (2 x 1) girada ocupa x de -0,5 a 0,5 y z de -1 a 1; B (1 x 1) en (1,5; 0): la caja va de x = -0,5 a 2 y de z = -1 a 1.
    fake.bridge.cluster.insert([piece('sofa', [0, 0], [2, 1, 1], Math.PI / 2), piece('dining-chair', [1.5, 0], [1, 1, 1])])
    const { items } = lastCall(fake)
    expect(items[0]?.position[0]).toBeCloseTo(2 - 0.75, 9)
    expect(items[0]?.position[2]).toBeCloseTo(1.5, 9)
    expect(items[1]?.position[0]).toBeCloseTo(2 + 0.75, 9)
  })

  it('una pieza sin medidas ocupa 1 x 1 m, como en Pascal', () => {
    const fake = setup({ zoneId: 'zone_sala' })
    fake.bridge.cluster.insert([piece('sofa', [0, 0], undefined), piece('dining-chair', [2, 0], undefined)])
    const { items } = lastCall(fake)
    // Cajas de 1 x 1 en x = 0 y x = 2: van de x = -0,5 a 2,5 (centro 1) y se llevan a x = 2.
    expect(items[0]?.position[0]).toBeCloseTo(1, 9)
    expect(items[1]?.position[0]).toBeCloseTo(3, 9)
  })

  it('un ambiente en L usa el centro de su área (el centroide), no el de su caja', () => {
    const fake = setup({ zoneId: 'zone_l' })
    fake.bridge.cluster.insert([SOFA])
    // L de área 6: el centroide es (1,5; 1); el centro de su caja sería (2; 1,5).
    const [item] = lastCall(fake).items
    expect(item?.position[0]).toBeCloseTo(1.5, 9)
    expect(item?.position[2]).toBeCloseTo(1, 9)
  })

  it('un ambiente sin área (dos puntos) cae al centro de su caja', () => {
    const fake = setup({ zoneId: 'zone_punto' })
    fake.bridge.cluster.insert([SOFA])
    const [item] = lastCall(fake).items
    expect(item?.position[0]).toBeCloseTo(2, 9)
    expect(item?.position[2]).toBeCloseTo(1, 9)
  })

  it('sin ambiente elegido, el centro de la planta activa: la caja que envuelve sus muros y ambientes', () => {
    const fake = setup()
    fake.bridge.cluster.insert([SOFA])
    const [item] = lastCall(fake).items
    expect(item?.position[0]).toBeCloseTo(3, 9)
    expect(item?.position[2]).toBeCloseTo(2, 9)
  })

  it('un ambiente elegido que es de otra planta no cuenta: usa el centro de la planta donde inserta', () => {
    const fake = setup({ zoneId: 'zone_alta' })
    fake.bridge.cluster.insert([SOFA])
    const [item] = lastCall(fake).items
    expect(item?.position[0]).toBeCloseTo(3, 9)
    expect(item?.position[2]).toBeCloseTo(2, 9)
  })

  it('en una planta vacía el conjunto queda centrado en el origen', () => {
    const fake = setup()
    fake.bridge.cluster.insert([SOFA], 'level_c')
    const [item] = lastCall(fake).items
    expect(item?.position).toEqual([0, 0, 0])
  })

  it('redondea al milímetro', () => {
    const fake = setup({ zoneId: 'zone_sala' })
    fake.bridge.cluster.insert([piece('sofa', [0, 0], [1, 1, 1]), piece('dining-chair', [0.3333333, 0], [1, 1, 1])])
    const { items } = lastCall(fake)
    // La caja va de x = -0,5 a 0,8333333 (centro 0,1666...): las piezas quedan en 1,8333... y 2,1666..., a un milímetro exacto.
    for (const item of items) {
      for (const value of item.position) expect(Math.abs(value * 1000 - Math.round(value * 1000))).toBeLessThan(1e-9)
    }
    expect(items[0]?.position[0]).toBeCloseTo(1.8333, 2)
    expect(items[1]?.position[0]).toBeCloseTo(2.1667, 2)
    expect(items[0]?.position[2]).toBe(1.5)
  })
})

describe('bridge.cluster.insert: la selección', () => {
  it('deja seleccionadas todas las piezas creadas, juntas, y suelta el ambiente elegido', () => {
    const fake = setup({ zoneId: 'zone_sala', selectedIds: ['wall_n'] })
    const ids = fake.bridge.cluster.insert([SOFA, CHAIR])
    expect(ids).toHaveLength(2)
    expect(fake.viewer.getState().selection).toEqual({ buildingId: 'building_1', levelId: 'level_a', zoneId: null, selectedIds: ids })
  })

  it('pasa a Seleccionar (para ver la caja y mover el conjunto) y a la fase de muebles', () => {
    const fake = setup()
    expect(fake.editor.getState()).toMatchObject({ phase: 'structure', mode: 'build', tool: 'wall' })
    fake.bridge.cluster.insert([SOFA])
    expect(fake.editor.getState()).toMatchObject({ phase: 'furnish', mode: 'select', tool: null })
  })

  it('si ya estaba en Seleccionar y en muebles, no toca la herramienta', () => {
    const fake = setup()
    fake.editor.setState({ phase: 'furnish', mode: 'select', tool: null })
    fake.bridge.cluster.insert([SOFA])
    expect(fake.deps.editor.getState().armToolMode).not.toHaveBeenCalled()
    expect(fake.deps.editor.getState().setPhase).not.toHaveBeenCalled()
  })

  it('la selección se escribe al final: lo que cambie de fase o herramienta no la pisa', () => {
    const fake = setup()
    const order: string[] = []
    const { setPhase, armToolMode } = fake.editor.getState()
    fake.editor.setState({
      setPhase: vi.fn((phase: Parameters<typeof setPhase>[0]) => {
        order.push('fase')
        setPhase(phase)
      }),
      armToolMode: vi.fn((next: Parameters<typeof armToolMode>[0]) => {
        order.push('herramienta')
        armToolMode(next)
      }),
    })
    const setSelection = fake.viewer.getState().setSelection
    fake.viewer.setState({
      setSelection: vi.fn((update: Parameters<typeof setSelection>[0]) => {
        order.push('selección')
        setSelection(update)
      }),
    })
    fake.bridge.cluster.insert([SOFA])
    expect(order.at(-1)).toBe('selección')
    expect(order).toContain('fase')
    expect(order).toContain('herramienta')
  })
})
