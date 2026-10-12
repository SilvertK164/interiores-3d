import { describe, expect, it, vi } from 'vitest'
import { createLevelKeeper } from '../src/editor/shell/bridge/level-keeper'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { LOFT } from './support/loft'
import { createFakeDeps } from './support/fake-deps'

const select = (fake: ReturnType<typeof createFakeDeps>, levelId: string | null) =>
  fake.viewer.setState({ selection: { buildingId: 'building_1', levelId, zoneId: null, selectedIds: [] } })

const setup = (levelId: string | null = null) => {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes: LOFT })
  select(fake, levelId)
  const setHideAbove = vi.fn()
  const stop = createLevelKeeper({ ...fake.deps, setHideAbove }).start()
  return { ...fake, setHideAbove, stop }
}

describe('nivel activo por defecto', () => {
  it('al abrir sin nivel activo elige la planta baja', () => {
    const { viewer } = setup(null)
    expect(viewer.getState().selection.levelId).toBe('level_a')
  })

  it('no cambia un nivel activo válido', () => {
    const { viewer } = setup('level_b')
    expect(viewer.getState().selection.levelId).toBe('level_b')
  })

  it('si Pascal deja el nivel en nada (p. ej. al salir de Recorrer) vuelve a la planta que había', () => {
    const fake = setup('level_b')
    select(fake, null)
    expect(fake.viewer.getState().selection.levelId).toBe('level_b')
  })

  it('al borrarse el nivel activo pasa al más cercano', () => {
    const fake = setup('level_b')
    const { level_b: _gone, ...rest } = LOFT as Record<string, unknown>
    const nodes = { ...rest, building_1: { ...(LOFT.building_1 as object), children: ['level_a'] } } as unknown as SceneLike['nodes']
    fake.scene.setState({ nodes })
    select(fake, null)
    expect(fake.viewer.getState().selection.levelId).toBe('level_a')
  })

  it('sin edificio o sin plantas no hace nada ni rompe', () => {
    const fake = createFakeDeps()
    select(fake, null)
    createLevelKeeper({ ...fake.deps, setHideAbove: vi.fn() }).start()
    expect(fake.viewer.getState().selection.levelId).toBeNull()
  })

  it('al detenerlo deja de vigilar', () => {
    const fake = setup(null)
    fake.stop()
    select(fake, null)
    expect(fake.viewer.getState().selection.levelId).toBeNull()
  })
})

describe('el 3D sigue a la planta activa en Editar', () => {
  it('en Editar oculta las plantas superiores y fuerza Juntos; en Ver lo suelta y devuelve el modo anterior', () => {
    const fake = createFakeDeps()
    fake.scene.setState({ nodes: LOFT })
    fake.viewer.setState({ levelMode: 'exploded' })
    select(fake, 'level_a')
    const setHideAbove = vi.fn()
    createLevelKeeper({ ...fake.deps, setHideAbove }).start()
    expect(setHideAbove).toHaveBeenLastCalledWith(true)
    expect(fake.viewer.getState().levelMode).toBe('stacked')
    fake.scene.setState({ readOnly: true })
    expect(setHideAbove).toHaveBeenLastCalledWith(false)
    expect(fake.viewer.getState().levelMode).toBe('exploded')
  })

  it('al detenerlo suelta el ocultamiento', () => {
    const fake = setup('level_a')
    fake.stop()
    expect(fake.setHideAbove).toHaveBeenLastCalledWith(false)
  })
})
