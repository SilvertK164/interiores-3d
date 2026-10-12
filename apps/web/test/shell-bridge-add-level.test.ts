import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'
import { withLoft } from './support/loft'

afterEach(() => vi.useRealTimers())

describe('addLevel', () => {
  it('crea la planta siguiente al índice más alto y la deja activa', () => {
    const fake = withLoft()
    const bridge = createBridge(fake.deps)
    expect(bridge.addLevel()).toBe('level_nuevo')
    expect(fake.deps.createLevel).toHaveBeenCalledWith({ buildingId: 'building_1', level: 2 })
    expect(fake.viewer.getState().selection).toMatchObject({ buildingId: 'building_1', levelId: 'level_nuevo' })
  })

  it('un doble clic en "Agregar planta" crea una sola planta', () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const fake = withLoft()
    const bridge = createBridge(fake.deps)
    bridge.addLevel()
    expect(bridge.addLevel()).toBeNull()
    expect(fake.deps.createLevel).toHaveBeenCalledTimes(1)
  })

  it('en Ver no se crean plantas, y sin edificio tampoco', () => {
    const fake = withLoft()
    fake.scene.setState({ readOnly: true })
    expect(createBridge(fake.deps).addLevel()).toBeNull()
    const empty = createFakeDeps()
    expect(createBridge(empty.deps).addLevel()).toBeNull()
    expect(empty.deps.createLevel).not.toHaveBeenCalled()
  })
})
