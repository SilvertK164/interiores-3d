import type { CoreDeps } from './core'

export type ImageDeps = {
  /** Fotografía lo que muestra el lienzo 3D en este momento (el generador de miniaturas de Pascal, modo `viewport`). */
  captureView(): Promise<Blob>
}

const SETTLE_MS = 600
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Imagen 3D: la vista isométrica del proyecto como imagen. */
export function createImageSlice(deps: CoreDeps & ImageDeps) {
  return {
    image: {
      /**
       * Pasa a la cámara isométrica (ortográfica), espera a que se acomode, fotografía y devuelve la cámara que había. La vista
       * del usuario no queda cambiada aunque la captura falle.
       */
      async captureIsometric(): Promise<Blob> {
        const viewer = deps.viewer.getState()
        const previous = viewer.cameraMode
        const change = previous !== 'orthographic'
        if (change) {
          viewer.setCameraMode('orthographic')
          await wait(SETTLE_MS)
        }
        try {
          return await deps.captureView()
        } finally {
          if (change) deps.viewer.getState().setCameraMode(previous)
        }
      },
    },
  }
}
