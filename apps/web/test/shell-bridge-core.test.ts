import { describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  return { ...fake, bridge: createBridge(fake.deps) }
}

describe('núcleo del puente', () => {
  it('snapshot entrega el estado crudo de los cuatro orígenes', () => {
    const { bridge } = setup()
    const snapshot = bridge.snapshot()
    expect(snapshot.editor).toMatchObject({ phase: 'structure', mode: 'build', tool: 'wall', viewMode: '3d' })
    expect(snapshot.scene).toMatchObject({ readOnly: false })
    expect(snapshot.history).toEqual({ canUndo: false, canRedo: false })
    expect(snapshot.viewer.selection.selectedIds).toEqual([])
  })

  it('subscribe avisa cuando cambia el editor, el visor, la escena o el historial, y deja de avisar al cancelar', () => {
    const { bridge, editor, viewer, scene, history } = setup()
    const listener = vi.fn()
    const stop = bridge.subscribe(listener)
    editor.setState({ viewMode: '2d' })
    viewer.setState({ selection: { buildingId: null, levelId: null, zoneId: null, selectedIds: [] } })
    scene.setState({ readOnly: true })
    history.set({ canUndo: true, canRedo: false })
    expect(listener).toHaveBeenCalledTimes(4)
    stop()
    editor.setState({ viewMode: '3d' })
    expect(listener).toHaveBeenCalledTimes(4)
  })

  it('mountDefaults aplica el tema y oculta el aviso de cámara, y su cierre los devuelve', () => {
    const { bridge, deps, undoTheme, showHint } = setup()
    const stop = bridge.mountDefaults()
    expect(deps.applyTheme).toHaveBeenCalledTimes(1)
    expect(deps.hideCameraHint).toHaveBeenCalledTimes(1)
    stop()
    expect(showHint).toHaveBeenCalledTimes(1)
    expect(undoTheme).toHaveBeenCalledTimes(1)
  })
})
