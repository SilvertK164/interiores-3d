import type { CoreDeps } from './core'
import { levelsOf } from './levels'

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
      /**
       * Una foto isométrica por planta: cada vez deja visible solo esa planta (modo Uno solo) y la elige como activa. Al final
       * devuelve la cámara, el modo de plantas y la planta activa que había.
       */
      async captureIsometricLevels(levelIds: readonly string[]): Promise<Blob[]> {
        const viewer = deps.viewer.getState()
        const { buildingId } = levelsOf(deps.scene.getState(), viewer)
        const before = { camera: viewer.cameraMode, levels: viewer.levelMode, selection: viewer.selection }
        const photos: Blob[] = []
        try {
          viewer.setCameraMode('orthographic')
          viewer.setLevelMode('solo')
          for (const id of levelIds) {
            deps.viewer.getState().setSelection(buildingId ? { buildingId, levelId: id } : { levelId: id })
            await wait(SETTLE_MS)
            photos.push(await deps.captureView())
          }
          return photos
        } finally {
          const now = deps.viewer.getState()
          now.setCameraMode(before.camera)
          now.setLevelMode(before.levels)
          now.setSelection({ ...before.selection, selectedIds: [...before.selection.selectedIds] })
        }
      },
    },
  }
}
