import { describe, expect, it, vi } from 'vitest'
import { type BridgeDeps, createBridge } from '../src/editor/shell/bridge'
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

describe('plano recto al entrar a 2D o a Ambas', () => {
  const camera = { target: [4, 0, 3], viewWidth: 20 }
  const setupCamera = (initial: typeof camera | null) => {
    const fake = setup()
    const listeners = new Set<() => void>()
    let latest: typeof camera | null = initial
    const deps: BridgeDeps = {
      ...fake.deps,
      camera: {
      latest: () => latest,
      subscribe: (l) => {
        listeners.add(l)
        return () => listeners.delete(l)
      },
      },
    }
    const bridge = createBridge(deps)
    const move = (next: typeof camera) => {
      latest = next
      for (const l of listeners) l()
    }
    return { ...fake, bridge, move, publish: fake.editor.getState().publishNavigationSyncPose }
  }

  it('al pasar a 2D o a Ambas pide la pose 2D con azimut 0 sobre el mismo punto y ancho', () => {
    for (const view of ['2d', 'split'] as const) {
      const { bridge, editor, publish } = setupCamera(camera)
      bridge.mountDefaults()
      expect(publish).not.toHaveBeenCalled()
      editor.getState().setViewMode(view)
      expect(publish).toHaveBeenCalledTimes(1)
      expect(publish).toHaveBeenCalledWith({ source: '2d', target: [4, 0, 3], azimuth: 0, viewWidth: 20 })
    }
  })

  it('si la vista guardada ya es 2D, endereza al montar', () => {
    const { bridge, editor, publish } = setupCamera(camera)
    editor.setState({ viewMode: '2d' })
    bridge.mountDefaults()
    expect(publish).toHaveBeenCalledTimes(1)
  })

  it('si aún no hay cámara, espera a la primera y la endereza una sola vez', () => {
    const { bridge, editor, move, publish } = setupCamera(null)
    bridge.mountDefaults()
    editor.getState().setViewMode('2d')
    expect(publish).not.toHaveBeenCalled()
    move(camera)
    move({ ...camera, viewWidth: 25 })
    expect(publish).toHaveBeenCalledTimes(1)
  })

  it('en 3D no toca la cámara, y al volver a 3D deja de esperar', () => {
    const { bridge, editor, move, publish } = setupCamera(null)
    bridge.mountDefaults()
    editor.getState().setViewMode('2d')
    editor.getState().setViewMode('3d')
    move(camera)
    expect(publish).not.toHaveBeenCalled()
  })
})
