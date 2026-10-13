import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { selectLevels, selectZones } from '../src/editor/shell/bridge/levels'
import { createFakeDeps } from './support/fake-deps'
import { withLoft } from './support/loft'

describe('selectLevels', () => {
  it('lista las plantas ordenadas por índice y con nombre en castellano aunque no tengan nombre o lo traigan en inglés', () => {
    expect(selectLevels(withLoft().snapshot())).toEqual({
      levels: [
        { id: 'level_a', name: 'Planta baja' },
        { id: 'level_b', name: 'Planta 1' },
      ],
      activeId: 'level_a',
    })
  })

  it('una escena sin edificio (o vacía) no rompe: no hay plantas ni planta activa', () => {
    expect(selectLevels(createFakeDeps().snapshot())).toEqual({ levels: [], activeId: null })
  })

  it('si la planta elegida ya no existe no queda ninguna activa', () => {
    const fake = withLoft()
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_borrado', zoneId: null, selectedIds: [] } })
    expect(selectLevels(fake.snapshot()).activeId).toBeNull()
  })
})

describe('selectZones', () => {
  it('lista los ambientes de la planta activa con su superficie y el nombre traducido; ignora lo que no es ambiente', () => {
    expect(selectZones(withLoft().snapshot())).toEqual({
      zones: [
        { id: 'zone_1', name: 'Sala de estar', area: 12 },
        { id: 'zone_2', name: 'Ambiente 2', area: 0 },
      ],
      selectedId: null,
    })
  })

  it('un proyecto en blanco no tiene ambientes y la planta sin hijos tampoco', () => {
    expect(selectZones(createFakeDeps().snapshot()).zones).toEqual([])
    const fake = withLoft()
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_b', zoneId: null, selectedIds: [] } })
    expect(selectZones(fake.snapshot()).zones).toEqual([])
  })

  it('marca el ambiente elegido', () => {
    const fake = withLoft()
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId: 'zone_1', selectedIds: [] } })
    expect(selectZones(fake.snapshot()).selectedId).toBe('zone_1')
  })
})

describe('selectLevel y selectZone', () => {
  it('elegir una planta la selecciona dentro de su edificio (Pascal vacía la selección del nivel anterior)', () => {
    const fake = withLoft()
    createBridge(fake.deps).selectLevel('level_b')
    expect(fake.viewer.getState().selection).toMatchObject({ buildingId: 'building_1', levelId: 'level_b' })
  })

  it('elegir un ambiente lo selecciona y deja la herramienta en Seleccionar; en Ver no hace nada', () => {
    const fake = withLoft()
    const bridge = createBridge(fake.deps)
    bridge.selectZone('zone_1') // el doble arranca con la herramienta de muro armada
    expect(fake.editor.getState()).toMatchObject({ mode: 'select', tool: null })
    expect(fake.viewer.getState().selection).toMatchObject({ zoneId: 'zone_1', selectedIds: [] })
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId: null, selectedIds: [] } })
    fake.scene.setState({ readOnly: true })
    bridge.selectZone('zone_2')
    expect(fake.viewer.getState().selection.zoneId).toBeNull()
  })
})
