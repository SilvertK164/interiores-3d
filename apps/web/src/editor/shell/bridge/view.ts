import type { CoreDeps } from './core'
import type { BridgeSnapshot, CameraMode, LevelMode, Shading, WallMode } from './types'

export type CameraMove = 'orbit-left' | 'orbit-right' | 'top'

export type ViewDeps = {
  /** Los eventos de cámara de Pascal (`camera-controls:orbit-ccw`, `orbit-cw` y `top-view`). */
  moveCamera(move: CameraMove): void
  /** Pasa a primera persona y pide el puntero sobre el lienzo 3D, todo dentro del clic que lo pidió (ver `pascal-bridge.ts`). */
  startWalkthrough(): void
}

export type ViewOptions = { walls: WallMode; levels: LevelMode; camera: CameraMode; shading: Shading }

/** Lo que muestra el panel Vista 3D, leído del visor de Pascal. */
export function selectViewOptions(s: BridgeSnapshot): ViewOptions {
  return { walls: s.viewer.wallMode, levels: s.viewer.levelMode, camera: s.viewer.cameraMode, shading: s.viewer.shading }
}

export function createViewSlice(deps: CoreDeps & ViewDeps) {
  const viewer = () => deps.viewer.getState()
  return {
    setWalls: (mode: WallMode): void => viewer().setWallMode(mode),
    setLevels: (mode: LevelMode): void => viewer().setLevelMode(mode),
    setCamera: (mode: CameraMode): void => viewer().setCameraMode(mode),
    setShading: (shading: Shading): void => viewer().setShading(shading),
    moveCamera: (move: CameraMove): void => deps.moveCamera(move),
    /** Recorrer es de Ver (primera persona con el puntero bloqueado); si ya se está recorriendo, no hace nada. */
    startWalkthrough(): void {
      if (!deps.scene.getState().readOnly || deps.editor.getState().isFirstPersonMode) return
      deps.startWalkthrough()
    },
    stopWalkthrough: (): void => deps.editor.getState().setFirstPersonMode(false),
  }
}
