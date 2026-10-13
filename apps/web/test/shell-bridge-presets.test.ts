import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  return { ...fake, bridge: createBridge(fake.deps) }
}

describe('colocar con preset (A medida)', () => {
  it('un estante arma la herramienta shelf en la fase de muebles con el parche de su estilo', () => {
    const { bridge, deps, editor } = setup()
    bridge.placePreset({ kind: 'shelf', style: 'bookshelf' })
    expect(editor.getState()).toMatchObject({ phase: 'furnish', mode: 'build', tool: 'shelf' })
    expect(deps.armNodePatch).toHaveBeenCalledWith('shelf', expect.objectContaining({ style: 'bookshelf' }))
  })

  it('los cubículos son lo que Pascal crea por omisión: no hay parche', () => {
    const { bridge, deps, editor } = setup()
    bridge.placePreset({ kind: 'shelf', style: 'cubby' })
    expect(editor.getState().tool).toBe('shelf')
    expect(deps.armNodePatch).not.toHaveBeenCalled()
    expect(deps.clearNodePatch).toHaveBeenCalled()
  })

  it('un gabinete deja el módulo en los valores de la herramienta y arma cabinet', () => {
    const { bridge, editor } = setup()
    bridge.placePreset({ kind: 'cabinet', preset: 'fridge-single' })
    expect(editor.getState()).toMatchObject({ phase: 'furnish', tool: 'cabinet' })
    expect(editor.getState().setToolDefaults).toHaveBeenCalledWith('cabinet', expect.objectContaining({ cabinetType: 'tall' }))
  })

  it('al salir de la herramienta se sueltan los valores del gabinete y el parche', () => {
    const { bridge, deps, editor } = setup()
    bridge.placePreset({ kind: 'cabinet', preset: 'sink-base' })
    editor.setState({ tool: null })
    expect(editor.getState().setToolDefaults).toHaveBeenLastCalledWith('cabinet', null)
    expect(deps.clearNodePatch).toHaveBeenCalled()
  })

  it('una escalera curva arma stair en Estructura con el tipo; la recta no lleva parche', () => {
    const { bridge, deps, editor } = setup()
    bridge.placePreset({ kind: 'stair', stairType: 'spiral' })
    expect(editor.getState()).toMatchObject({ phase: 'structure', mode: 'build', tool: 'stair' })
    expect(deps.armNodePatch).toHaveBeenCalledWith('stair', { stairType: 'spiral' })
    bridge.placePreset({ kind: 'stair', stairType: 'straight' })
    expect(deps.armNodePatch).toHaveBeenCalledTimes(1)
  })

  it('en Ver no se coloca nada', () => {
    const { bridge, deps, editor, scene } = setup()
    scene.setState({ readOnly: true })
    bridge.placePreset({ kind: 'shelf', style: 'open-rack' })
    expect(editor.getState().tool).toBe('wall')
    expect(deps.armNodePatch).not.toHaveBeenCalled()
  })
})
