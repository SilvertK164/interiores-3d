import type { FrameMeasure } from '../frame-insets'
import type { CoreDeps } from './core'

export type FrameDeps = {
  /** Encuadra el plano y la cámara 3D a la planta activa; cada uno con sus márgenes. Pascal los mueve por separado. */
  frameViews(measure: FrameMeasure): void
}

export function createFrameSlice(deps: CoreDeps & FrameDeps) {
  return {
    /** Encuadre de ambas vistas (al entrar, al cambiar de planta y al redimensionar). No hace nada mientras se recorre. */
    frameViews(measure: FrameMeasure): void {
      if (deps.editor.getState().isFirstPersonMode) return
      deps.frameViews(measure)
    },
  }
}
