import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { ScenePose } from '../src/editor/shell/bridge/frame'
import type { FrameMeasure } from '../src/editor/shell/frame-insets'
import { NO_INSETS } from '../src/editor/shell/framing'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  return { ...fake, bridge: createBridge(fake.deps) }
}

const view = { canvas: { width: 600, height: 700 }, insets: NO_INSETS }
const BOTH: FrameMeasure = { plan: view, scene: view }
const PLAN_ONLY: FrameMeasure = { plan: view, scene: null }
const POSE: ScenePose = { position: [0, 1.55, 1.2], target: [0, 0.75, -0.742], fov: 60 }

describe('encuadre de las vistas', () => {
  it('le pasa a Pascal lo medido y devuelve si quedó listo', () => {
    const { bridge, deps } = setup()
    deps.frameViews.mockReturnValueOnce(false)
    expect(bridge.frameViews(BOTH)).toBe(false)
    expect(deps.frameViews).toHaveBeenCalledWith(BOTH, undefined)
    expect(bridge.frameViews(BOTH)).toBe(true)
  })

  it('durante el recorrido no encuadra y avisa que está listo', () => {
    const { bridge, deps, editor } = setup()
    editor.setState({ isFirstPersonMode: true })
    expect(bridge.frameViews(BOTH)).toBe(true)
    expect(deps.frameViews).not.toHaveBeenCalled()
  })
})

describe('abrir la cámara 3D en un punto de vista (la foto)', () => {
  it('encuadra de inmediato con esa pose en lugar de la diagonal automática', () => {
    const { bridge, deps } = setup()
    bridge.openCameraAt(POSE, BOTH)
    expect(deps.frameViews).toHaveBeenCalledTimes(1)
    expect(deps.frameViews).toHaveBeenCalledWith(BOTH, POSE)
  })

  it('mientras la retiene, cada pasada del encuadre (reintentos, cambios de tamaño) la vuelve a usar y no la pisa', () => {
    const { bridge, deps } = setup()
    bridge.openCameraAt(POSE, BOTH)
    for (let pass = 0; pass < 3; pass++) bridge.frameViews(BOTH)
    expect(deps.frameViews).toHaveBeenCalledTimes(4)
    for (const call of deps.frameViews.mock.calls) expect(call[1]).toEqual(POSE)
  })

  it('si el encuadre todavía no está listo (la escena sigue cargando) o solo se ve el plano, la conserva para el próximo intento', () => {
    const { bridge, deps } = setup()
    deps.frameViews.mockReturnValueOnce(false)
    bridge.openCameraAt(POSE, BOTH)
    expect(bridge.frameViews(PLAN_ONLY)).toBe(true)
    bridge.frameViews(BOTH)
    expect(deps.frameViews).toHaveBeenLastCalledWith(BOTH, POSE)
  })

  it('no guarda la misma pose del que llama: una copia', () => {
    const { bridge, deps } = setup()
    const mine: ScenePose = { position: [0, 1.55, 1.2], target: [0, 0.75, -0.742], fov: 60 }
    bridge.openCameraAt(mine, BOTH)
    mine.position[2] = 99
    bridge.frameViews(BOTH)
    expect(deps.frameViews).toHaveBeenLastCalledWith(BOTH, POSE)
  })

  it('si el 3D estaba oculto (solo el plano) pasa a 3D para que se vea; en 3D y en Ambas no cambia la vista', () => {
    const { bridge, editor } = setup()
    const setViewMode = editor.getState().setViewMode
    editor.setState({ viewMode: '2d' })
    bridge.openCameraAt(POSE, PLAN_ONLY)
    expect(setViewMode).toHaveBeenCalledWith('3d')
    expect(editor.getState().viewMode).toBe('3d')

    for (const mode of ['3d', 'split'] as const) {
      const other = setup()
      other.editor.setState({ viewMode: mode })
      other.bridge.openCameraAt(POSE, BOTH)
      expect(other.editor.getState().setViewMode).not.toHaveBeenCalled()
      expect(other.editor.getState().viewMode).toBe(mode)
    }
  })

  it('cuando la persona mueve la cámara (rueda, arrastre, giro, vista superior) la suelta y el encuadre vuelve a ser el de siempre', () => {
    const { bridge, deps, cameraMoved, watching } = setup()
    bridge.openCameraAt(POSE, BOTH)
    expect(watching()).toBe(1)
    cameraMoved()
    expect(watching()).toBe(0)
    bridge.frameViews(BOTH)
    expect(deps.frameViews).toHaveBeenLastCalledWith(BOTH, undefined)
  })

  it('al cambiar de planta la suelta: el encuadre de la otra planta es el de siempre', () => {
    const { bridge, deps, viewer, watching } = setup()
    bridge.openCameraAt(POSE, BOTH) // aplicada con level_1 activa
    bridge.frameViews(BOTH)
    expect(deps.frameViews).toHaveBeenLastCalledWith(BOTH, POSE)
    viewer.setState({ selection: { ...viewer.getState().selection, levelId: 'level_2' } })
    bridge.frameViews(BOTH)
    expect(deps.frameViews).toHaveBeenLastCalledWith(BOTH, undefined)
    expect(watching()).toBe(0)
  })

  it('al empezar a recorrer la suelta: al salir, el encuadre es el de siempre', () => {
    const { bridge, deps, editor, watching } = setup()
    bridge.openCameraAt(POSE, BOTH)
    editor.setState({ isFirstPersonMode: true })
    expect(watching()).toBe(0)
    editor.setState({ isFirstPersonMode: false })
    bridge.frameViews(BOTH)
    expect(deps.frameViews).toHaveBeenLastCalledWith(BOTH, undefined)
  })

  it('abrir otra pose reemplaza a la anterior y deja de escuchar la cámara una sola vez', () => {
    const { bridge, deps, watching } = setup()
    const other: ScenePose = { position: [1, 1.5, 2], target: [1, 1, 0], fov: 50 }
    bridge.openCameraAt(POSE, BOTH)
    bridge.openCameraAt(other, BOTH)
    expect(watching()).toBe(1)
    expect(deps.frameViews).toHaveBeenLastCalledWith(BOTH, other)
  })

  it('al cerrar el shell (dispose) la suelta y deja de escuchar', () => {
    const { bridge, deps, watching } = setup()
    bridge.openCameraAt(POSE, BOTH)
    bridge.dispose()
    expect(watching()).toBe(0)
    bridge.frameViews(BOTH)
    expect(deps.frameViews).toHaveBeenLastCalledWith(BOTH, undefined)
  })

  it('soltarla sin haberla abierto no hace nada', () => {
    const { bridge, watching } = setup()
    expect(() => bridge.releaseCameraPose()).not.toThrow()
    expect(watching()).toBe(0)
  })
})
