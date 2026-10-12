import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { selectEditTarget } from '../src/editor/shell/bridge/edit'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { createFakeDeps } from './support/fake-deps'

const SCENE = {
  building_1: { id: 'building_1', type: 'building', children: ['level_a'] },
  level_a: { id: 'level_a', type: 'level', level: 0, children: ['wall_1', 'zone_1', 'item_1'] },
  wall_1: { id: 'wall_1', type: 'wall', parentId: 'level_a', start: [0, 0], end: [4, 0], children: ['door_1', 'item_2'] },
  door_1: { id: 'door_1', type: 'door', parentId: 'wall_1', wallId: 'wall_1', position: [1, 1.05, 0] },
  item_2: { id: 'item_2', type: 'item', parentId: 'wall_1', children: ['item_3'] },
  item_3: { id: 'item_3', type: 'item', parentId: 'item_2' },
  zone_1: { id: 'zone_1', type: 'zone', name: 'Sala', polygon: [[0, 0], [4, 0], [4, 3], [0, 3]] },
  item_1: { id: 'item_1', type: 'item', position: [1, 0, 1] },
} as unknown as SceneLike['nodes']

function setup() {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes: SCENE })
  const select = (selectedIds: string[], zoneId: string | null = null) =>
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId, selectedIds } })
  return { ...fake, bridge: createBridge(fake.deps), select }
}

describe('selectEditTarget', () => {
  it('sin nada elegido, o con varios, no hay panel', () => {
    const { snapshot, select } = setup()
    expect(selectEditTarget(snapshot())).toBeNull()
    select(['item_1', 'wall_1'])
    expect(selectEditTarget(snapshot())).toBeNull()
  })

  it('un muro elegido trae cuántos elementos cuelgan de él, contando los de más abajo', () => {
    const { snapshot, select } = setup()
    select(['wall_1'])
    expect(selectEditTarget(snapshot())).toMatchObject({ node: { id: 'wall_1' }, hostLength: null, descendants: 3 })
  })

  it('una puerta trae el largo de su muro; un ambiente elegido (zoneId) también es un elemento', () => {
    const { snapshot, select } = setup()
    select(['door_1'])
    expect(selectEditTarget(snapshot())).toMatchObject({ node: { id: 'door_1' }, hostLength: 4, descendants: 0 })
    select([], 'zone_1')
    expect(selectEditTarget(snapshot())).toMatchObject({ node: { id: 'zone_1', type: 'zone' } })
  })

  it('si el elemento elegido ya no existe el panel se cierra en lugar de fallar', () => {
    const { snapshot, select, scene } = setup()
    select(['item_1'])
    expect(selectEditTarget(snapshot())).not.toBeNull()
    const { item_1: _borrado, ...rest } = SCENE as unknown as Record<string, unknown>
    scene.setState({ nodes: rest as unknown as SceneLike['nodes'] })
    expect(selectEditTarget(snapshot())).toBeNull()
  })

  it('en Ver no hay panel de propiedades', () => {
    const { snapshot, select, scene } = setup()
    select(['item_1'])
    scene.setState({ readOnly: true })
    expect(selectEditTarget(snapshot())).toBeNull()
  })
})

describe('commit y clearSelection', () => {
  it('commit pasa el cambio a Pascal; en Ver o con un elemento que ya no existe no hace nada', () => {
    const { bridge, deps, scene } = setup()
    bridge.commit('door_1', { width: 1 })
    expect(deps.commitFields).toHaveBeenCalledWith('door_1', { width: 1 })
    bridge.commit('no_existe', { width: 1 })
    scene.setState({ readOnly: true })
    bridge.commit('door_1', { width: 2 })
    expect(deps.commitFields).toHaveBeenCalledTimes(1)
  })

  it('clearSelection cierra el panel sin tocar la escena', () => {
    const { bridge, viewer, select } = setup()
    select(['item_1'])
    bridge.clearSelection()
    expect(viewer.getState().selection).toMatchObject({ selectedIds: [], zoneId: null })
  })
})
