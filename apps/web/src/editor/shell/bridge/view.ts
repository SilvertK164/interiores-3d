import { pickSpawn, type WalkSpawn } from '../walk-spawn'
import type { CoreDeps } from './core'
import { levelsOf } from './levels'
import type { BridgeSnapshot, CameraMode, LevelMode, Shading, WallMode } from './types'

export type CameraMove = 'orbit-left' | 'orbit-right' | 'top'

export type ViewDeps = {
  /** Los eventos de cámara de Pascal (`camera-controls:orbit-ccw`, `orbit-cw` y `top-view`). */
  moveCamera(move: CameraMove): void
  /** Pasa a primera persona (empezando en `spawn`, en coordenadas de esa planta) y pide el puntero sobre el lienzo 3D, todo dentro del clic que lo pidió (ver `pascal-bridge.ts`). */
  startWalkthrough(spawn: WalkSpawn | null, levelId: string | null): void
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
    /**
     * Recorrer es de Ver (primera persona con el puntero bloqueado); si ya se está recorriendo, no hace nada. Empieza en el centro del
     * ambiente más grande de la planta activa (si no, Pascal lo deriva de la cámara y cae afuera o sobre el techo) y con las plantas
     * Juntas: en Solo el recorrido perdería los pisos que esconde ese modo. Al salir, por cualquier camino, vuelve el modo anterior.
     */
    startWalkthrough(): void {
      if (!deps.scene.getState().readOnly || deps.editor.getState().isFirstPersonMode) return
      const { levels } = levelsOf(deps.scene.getState(), viewer())
      const active = levels.find((l) => l.id === viewer().selection.levelId)
      const zones = (active?.children ?? [])
        .map((id) => deps.scene.getState().nodes[id] as { type?: string; polygon?: readonly (readonly [number, number])[] } | undefined)
        .filter((n) => n?.type === 'zone')
        .map((n) => ({ polygon: n?.polygon ?? [] }))
      const previous = viewer().levelMode
      if (previous !== 'stacked') viewer().setLevelMode('stacked')
      const stop = deps.editor.subscribe(() => {
        if (deps.editor.getState().isFirstPersonMode) return
        stop()
        if (viewer().levelMode === 'stacked' && previous !== 'stacked') viewer().setLevelMode(previous)
      })
      deps.startWalkthrough(pickSpawn(zones), active?.id ?? null)
    },
    stopWalkthrough: (): void => deps.editor.getState().setFirstPersonMode(false),
  }
}
