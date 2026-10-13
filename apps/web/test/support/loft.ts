import type { SceneLike } from '../../src/editor/shell/bridge/types'
import { createFakeDeps } from './fake-deps'

const nodes = (list: Record<string, object>) => list as unknown as SceneLike['nodes']

/** Un edificio con dos plantas: la baja sin nombre (con dos ambientes y un muro) y "Floor 1" vacía, como las deja Pascal. */
export const LOFT = nodes({
  site_1: { id: 'site_1', type: 'site', children: ['building_1'] },
  building_1: { id: 'building_1', type: 'building', children: ['level_b', 'level_a'] },
  level_a: { id: 'level_a', type: 'level', level: 0, children: ['zone_1', 'wall_1', 'zone_2'] },
  level_b: { id: 'level_b', type: 'level', level: 1, name: 'Floor 1', children: [] },
  wall_1: { id: 'wall_1', type: 'wall' },
  zone_1: { id: 'zone_1', type: 'zone', name: 'Sala de estar', polygon: [[0, 0], [4, 0], [4, 3], [0, 3]] },
  zone_2: { id: 'zone_2', type: 'zone', name: 'Zone 2', polygon: [[0, 0], [1, 0]] },
})

/** Los dobles con el edificio cargado y la planta baja elegida. */
export function withLoft() {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes: LOFT })
  fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId: null, selectedIds: [] } })
  return fake
}
