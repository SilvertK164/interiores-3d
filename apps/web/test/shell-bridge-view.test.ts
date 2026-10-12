import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { selectViewOptions } from '../src/editor/shell/bridge/view'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  return { ...fake, bridge: createBridge(fake.deps), options: () => selectViewOptions(fake.snapshot()) }
}

describe('opciones de la Vista 3D', () => {
  it('leen el estado real del visor de Pascal', () => {
    const { options, viewer } = setup()
    expect(options()).toEqual({ walls: 'up', levels: 'stacked', camera: 'perspective', shading: 'solid' })
    viewer.setState({ wallMode: 'translucent', levelMode: 'manual' })
    expect(options()).toMatchObject({ walls: 'translucent', levels: 'manual' })
  })

  it('cada opción llama al setter de Pascal y se refleja en la lectura', () => {
    const { bridge, options } = setup()
    bridge.setWalls('cutaway')
    bridge.setLevels('exploded')
    bridge.setCamera('orthographic')
    bridge.setShading('rendered')
    expect(options()).toEqual({ walls: 'cutaway', levels: 'exploded', camera: 'orthographic', shading: 'rendered' })
  })
})

describe('cámara y recorrido', () => {
  it('girar y la vista superior piden a Pascal el movimiento de cámara', () => {
    const { bridge, deps } = setup()
    bridge.moveCamera('orbit-left')
    bridge.moveCamera('orbit-right')
    bridge.moveCamera('top')
    expect(deps.moveCamera).toHaveBeenNthCalledWith(1, 'orbit-left')
    expect(deps.moveCamera).toHaveBeenNthCalledWith(2, 'orbit-right')
    expect(deps.moveCamera).toHaveBeenNthCalledWith(3, 'top')
  })

  it('Recorrer solo arranca en Ver y una sola vez', () => {
    const { bridge, deps, scene, editor } = setup()
    bridge.startWalkthrough()
    expect(deps.startWalkthrough).not.toHaveBeenCalled() // en Editar no se recorre
    scene.setState({ readOnly: true })
    bridge.startWalkthrough()
    bridge.startWalkthrough()
    expect(deps.startWalkthrough).toHaveBeenCalledTimes(1)
    expect(editor.getState().isFirstPersonMode).toBe(true)
  })

  it('salir del recorrido apaga la primera persona', () => {
    const { bridge, scene, editor } = setup()
    scene.setState({ readOnly: true })
    bridge.startWalkthrough()
    bridge.stopWalkthrough()
    expect(editor.getState().isFirstPersonMode).toBe(false)
  })
})
