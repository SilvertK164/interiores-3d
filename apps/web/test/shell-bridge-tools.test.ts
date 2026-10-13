import { describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  return { ...fake, bridge: createBridge(fake.deps), e: fake.editor.getState }
}
/** Orden global de la primera llamada de cada doble: sirve para comprobar qué se llamó antes. */
const firstCall = (fn: (...args: never[]) => unknown) => vi.mocked(fn).mock.invocationCallOrder[0] ?? Number.NaN

describe('arm', () => {
  it('Seleccionar y Eliminar arman el modo y nada más', () => {
    const { bridge, e } = setup()
    bridge.arm({ kind: 'select' })
    expect(e()).toMatchObject({ mode: 'select', tool: null, phase: 'structure' })
    bridge.arm({ kind: 'delete' })
    expect(e()).toMatchObject({ mode: 'delete', tool: null })
    expect(e().setPhase).not.toHaveBeenCalled()
  })

  it('una herramienta de estructura pasa a la fase structure y se arma después (la escalera no existe en otra fase)', () => {
    const { bridge, e, editor } = setup()
    editor.setState({ phase: 'furnish', mode: 'select', tool: null })
    bridge.arm({ kind: 'tool', tool: 'stair' })
    expect(e()).toMatchObject({ phase: 'structure', mode: 'build', tool: 'stair' })
    expect(firstCall(e().setPhase)).toBeLessThan(firstCall(e().armToolMode))
  })

  it('Muro después de Ambiente devuelve la capa de elementos antes de armar; Ambiente no la toca', () => {
    const { bridge, e, editor } = setup()
    editor.setState({ structureLayer: 'zones' })
    bridge.arm({ kind: 'tool', tool: 'wall' })
    expect(e().setStructureLayer).toHaveBeenCalledWith('elements')
    expect(e()).toMatchObject({ mode: 'build', tool: 'wall', structureLayer: 'elements' })
    bridge.arm({ kind: 'tool', tool: 'zone' })
    expect(e().setStructureLayer).toHaveBeenCalledTimes(1)
    expect(e()).toMatchObject({ tool: 'zone' })
  })

  it('Muebles pasa a la fase furnish y arma `item`', () => {
    const { bridge, e } = setup()
    bridge.arm({ kind: 'furniture' })
    expect(e()).toMatchObject({ phase: 'furnish', mode: 'build', tool: 'item' })
  })

  it('Materiales sigue la secuencia de la tecla `p` de Pascal: fase, capa de elementos y armMaterialPaint', () => {
    const { bridge, e, editor } = setup()
    editor.setState({ structureLayer: 'zones' })
    bridge.arm({ kind: 'paint' })
    expect(e().setPhase).toHaveBeenCalledWith('structure')
    expect(e().setStructureLayer).toHaveBeenCalledWith('elements')
    expect(e().armMaterialPaint).toHaveBeenCalledTimes(1)
    expect(e()).toMatchObject({ mode: 'material-paint', tool: null })
  })

  it('Medir sigue la secuencia de measurement-control de Pascal, con el tipo elegido', () => {
    const { bridge, e } = setup()
    bridge.arm({ kind: 'measure', measure: 'angle' })
    expect(e().setLastMeasurementKind).toHaveBeenCalledWith('angle')
    expect(e().setToolDefaults).toHaveBeenCalledWith('measurement', { kind: 'angle' })
    expect(e().setMode).toHaveBeenCalledWith('build')
    expect(e().setTool).toHaveBeenCalledWith('measurement')
    expect(e()).toMatchObject({ phase: 'structure', mode: 'build', tool: 'measurement' })
    expect(firstCall(e().setToolDefaults)).toBeLessThan(firstCall(e().setTool))
  })
})

describe('cuadrícula y ajuste', () => {
  it('setGridStep y setSnap llaman a Pascal con el contexto indicado', () => {
    const { bridge, e } = setup()
    bridge.setGridStep(0.25)
    bridge.setSnap('wall', 'angles')
    bridge.setSnap('item', 'grid')
    expect(e().gridSnapStep).toBe(0.25)
    expect(e().snappingModeByContext).toMatchObject({ wall: 'angles', item: 'grid' })
  })
})
