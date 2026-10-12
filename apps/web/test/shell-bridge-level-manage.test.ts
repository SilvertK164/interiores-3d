import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { LEVEL_HEIGHT_LIMITS, selectLevelInfo } from '../src/editor/shell/bridge/level-manage'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { LOFT } from './support/loft'
import { createFakeDeps } from './support/fake-deps'

/** El Loft con dos plantas: la baja (3,6 m, dos ambientes y un muro) y la alta (2,8 m, vacía), más una escalera de la baja a la alta. */
const nodes = (extra: Record<string, object> = {}) =>
  ({
    ...LOFT,
    level_a: { ...(LOFT.level_a as object), height: 3.6, children: ['zone_1', 'wall_1', 'zone_2', 'stair_1'] },
    level_b: { ...(LOFT.level_b as object), height: 2.8 },
    stair_1: { id: 'stair_1', type: 'stair', parentId: 'level_a', fromLevelId: 'level_a', toLevelId: 'level_b', children: ['seg_1'] },
    seg_1: { id: 'seg_1', type: 'stair-segment', parentId: 'stair_1' },
    ...extra,
  }) as unknown as SceneLike['nodes']

const setup = (scene: SceneLike['nodes'] = nodes()) => {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes: scene })
  fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId: null, selectedIds: [] } })
  return { ...fake, bridge: createBridge(fake.deps) }
}

describe('lectura de las plantas', () => {
  it('cada planta trae su altura en metros y qué se pierde si se borra (ambientes y demás elementos)', () => {
    const { snapshot } = setup()
    const info = selectLevelInfo(snapshot())
    expect(info.map((l) => [l.id, l.height])).toEqual([['level_a', 3.6], ['level_b', 2.8]])
    expect(info[0]).toMatchObject({ zones: 2, elements: 3 }) // muro, escalera y su tramo
    expect(info[1]).toMatchObject({ zones: 0, elements: 0 })
  })

  it('una planta sin altura guardada muestra la de Pascal (2,5 m)', () => {
    const { snapshot } = setup({ ...nodes(), level_b: { id: 'level_b', type: 'level', level: 1, children: [] } } as never)
    expect(selectLevelInfo(snapshot())[1]?.height).toBe(2.5)
  })

  it('solo se puede borrar si hay más de una planta, y quién es la primera y la última', () => {
    const { snapshot } = setup()
    const info = selectLevelInfo(snapshot())
    expect(info.map((l) => [l.canDelete, l.canMoveUp, l.canMoveDown])).toEqual([[true, true, false], [true, false, true]])
    const single = setup({ ...nodes(), building_1: { ...(LOFT.building_1 as object), children: ['level_a'] } } as never)
    expect(selectLevelInfo(single.snapshot())[0]).toMatchObject({ canDelete: false, canMoveUp: false, canMoveDown: false })
  })
})

describe('renombrar', () => {
  it('guarda el nombre sin espacios sobrantes', () => {
    const { bridge, deps } = setup()
    expect(bridge.renameLevel('level_a', '  Planta principal  ')).toBe(true)
    expect(deps.updateLevels).toHaveBeenCalledWith([{ id: 'level_a', data: { name: 'Planta principal' } }])
  })

  it('un nombre vacío no se admite', () => {
    const { bridge, deps } = setup()
    expect(bridge.renameLevel('level_a', '   ')).toBe(false)
    expect(deps.updateLevels).not.toHaveBeenCalled()
  })

  it('un nombre muy largo se recorta a 40 letras; uno repetido se admite', () => {
    const { bridge, deps } = setup()
    bridge.renameLevel('level_a', 'x'.repeat(80))
    expect(deps.updateLevels).toHaveBeenLastCalledWith([{ id: 'level_a', data: { name: 'x'.repeat(40) } }])
    expect(bridge.renameLevel('level_b', 'Floor 1')).toBe(true)
  })

  it('en Ver no se renombra', () => {
    const { bridge, deps, scene } = setup()
    scene.setState({ readOnly: true })
    expect(bridge.renameLevel('level_a', 'Otra')).toBe(false)
    expect(deps.updateLevels).not.toHaveBeenCalled()
  })
})

describe('altura de la planta', () => {
  it('acepta metros con coma y ajusta a los límites', () => {
    const { bridge, deps } = setup()
    expect(LEVEL_HEIGHT_LIMITS).toEqual([2, 6])
    expect(bridge.setLevelHeight('level_a', '3,0')).toBe(true)
    expect(deps.updateLevels).toHaveBeenLastCalledWith([{ id: 'level_a', data: { height: 3 } }])
    bridge.setLevelHeight('level_a', '10')
    expect(deps.updateLevels).toHaveBeenLastCalledWith([{ id: 'level_a', data: { height: 6 } }])
    bridge.setLevelHeight('level_a', '1')
    expect(deps.updateLevels).toHaveBeenLastCalledWith([{ id: 'level_a', data: { height: 2 } }])
  })

  it('un valor igual al actual o que no es un número no cambia nada', () => {
    const { bridge, deps } = setup()
    expect(bridge.setLevelHeight('level_a', '3,6')).toBe(false)
    expect(bridge.setLevelHeight('level_a', 'alta')).toBe(false)
    expect(deps.updateLevels).not.toHaveBeenCalled()
  })
})

describe('subir y bajar de orden', () => {
  it('intercambia el índice con la vecina en un solo paso', () => {
    const { bridge, deps } = setup()
    expect(bridge.moveLevel('level_a', 'up')).toEqual({ moved: true, brokenStairs: 1 })
    expect(deps.updateLevels).toHaveBeenCalledWith([
      { id: 'level_a', data: { level: 1 } },
      { id: 'level_b', data: { level: 0 } },
    ])
  })

  it('la última no sube más y la primera no baja más', () => {
    const { bridge, deps } = setup()
    expect(bridge.moveLevel('level_b', 'up')).toEqual({ moved: false, brokenStairs: 0 })
    expect(bridge.moveLevel('level_a', 'down')).toEqual({ moved: false, brokenStairs: 0 })
    expect(deps.updateLevels).not.toHaveBeenCalled()
  })

  it('avisa si una escalera deja de ir de una planta a la inmediata de arriba', () => {
    const { bridge } = setup()
    // Antes de mover, la escalera sube de la baja a la alta; después va de la alta (ahora abajo) a la baja (ahora arriba): sigue
    // siendo contigua pero con el sentido cambiado. Con tres plantas, saltar una también cuenta.
    expect(bridge.moveLevel('level_b', 'down').brokenStairs).toBe(1)
  })
})

describe('eliminar planta', () => {
  it('pide a Pascal borrarla (con sus escaleras) y no hay doble borrado', () => {
    const { bridge, deps } = setup()
    expect(bridge.deleteLevel('level_a')).toBe(true)
    expect(deps.deleteLevel).toHaveBeenCalledWith('level_a')
    expect(bridge.deleteLevel('level_a')).toBe(false)
    expect(deps.deleteLevel).toHaveBeenCalledTimes(1)
  })

  it('la única planta no se puede borrar', () => {
    const single = setup({ ...nodes(), building_1: { ...(LOFT.building_1 as object), children: ['level_a'] } } as never)
    expect(single.bridge.deleteLevel('level_a')).toBe(false)
    expect(single.deps.deleteLevel).not.toHaveBeenCalled()
  })

  it('en Ver no se borra nada', () => {
    const { bridge, deps, scene } = setup()
    scene.setState({ readOnly: true })
    expect(bridge.deleteLevel('level_b')).toBe(false)
    expect(deps.deleteLevel).not.toHaveBeenCalled()
  })
})

describe('duplicar planta', () => {
  it('pide la copia a Pascal y deja la nueva activa', () => {
    const { bridge, deps, viewer } = setup()
    expect(bridge.duplicateLevel('level_a')).toBe('level_copia')
    expect(deps.duplicateLevel).toHaveBeenCalledWith('level_a')
    expect(viewer.getState().selection.levelId).toBe('level_copia')
  })

  it('dos clics seguidos crean una sola copia', () => {
    const { bridge, deps } = setup()
    bridge.duplicateLevel('level_a')
    expect(bridge.duplicateLevel('level_a')).toBeNull()
    expect(deps.duplicateLevel).toHaveBeenCalledTimes(1)
  })
})
