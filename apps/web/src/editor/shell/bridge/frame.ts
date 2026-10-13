import type { FrameMeasure } from '../frame-insets'
import type { CoreDeps } from './core'

/** Una cámara 3D: dónde está (`position`) y hacia dónde mira (`target`), en metros del mundo de Pascal, y su `fov` vertical en grados (sin él, el de la cámara del editor). */
export type ScenePose = { position: [number, number, number]; target: [number, number, number]; fov?: number }

export type FrameDeps = {
  /**
   * Encuadra el plano y la cámara 3D a la planta activa; cada uno con sus márgenes. Pascal los mueve por separado. Devuelve `false` si
   * algo todavía no está listo (la escena aún carga): hay que reintentar. Con `scenePose`, la cámara 3D va a esa pose (en perspectiva)
   * en lugar de al encuadre automático; sigue esperando a que haya geometría.
   */
  frameViews(measure: FrameMeasure, scenePose?: ScenePose): boolean
  /**
   * Avisa cada vez que algo que no es el encuadre mueve la cámara 3D: un gesto de la persona (arrastrar, rueda, teclas) o un botón de
   * vista de Pascal (girar, vista superior, enfocar). Devuelve cómo dejar de avisar.
   */
  watchCameraMoves(listener: () => void): () => void
}

export function createFrameSlice(deps: CoreDeps & FrameDeps) {
  // La pose con la que abre la cámara 3D (la de la foto): mientras esté retenida, el encuadre la usa en lugar de la diagonal y así
  // ninguna pasada posterior (el segundo reintento, un cambio de tamaño) la pisa. `levelId` es la planta en que se aplicó.
  let held: { pose: ScenePose; levelId: string | null } | null = null
  let stops: (() => void)[] = []

  function release(): void {
    held = null
    for (const stop of stops) stop()
    stops = []
  }

  function frameViews(measure: FrameMeasure): boolean {
    if (deps.editor.getState().isFirstPersonMode) return true
    const levelId = deps.viewer.getState().selection.levelId
    if (held?.levelId && held.levelId !== levelId) release()
    const ready = deps.frameViews(measure, held?.pose)
    // Aplicada de verdad: con el 3D a la vista y la geometría lista.
    if (held && ready && measure.scene) held.levelId ??= levelId
    return ready
  }

  return {
    frameViews,
    /**
     * Abre la cámara 3D en `pose` (una sola vez: la de la foto de «Escena desde una foto») y la encuadra ya con lo medido. La pose queda
     * retenida para que el encuadre automático no la pise, hasta que la persona mueva la cámara, cambie de planta o empiece a recorrer;
     * después el encuadre vuelve a ser el de siempre. Si el 3D estaba oculto (solo el plano) pasa a 3D; en 3D y en Ambas no cambia la vista.
     */
    openCameraAt(pose: ScenePose, measure: FrameMeasure): void {
      release()
      held = { pose: { ...pose, position: [...pose.position], target: [...pose.target] }, levelId: null }
      stops = [
        deps.watchCameraMoves(release),
        deps.editor.subscribe(() => {
          if (deps.editor.getState().isFirstPersonMode) release()
        }),
      ]
      const { viewMode, setViewMode } = deps.editor.getState()
      if (viewMode === '2d') setViewMode('3d')
      frameViews(measure)
    },
    /** Suelta la pose retenida (si hay): el encuadre vuelve a ser el automático. */
    releaseCameraPose: release,
  }
}
