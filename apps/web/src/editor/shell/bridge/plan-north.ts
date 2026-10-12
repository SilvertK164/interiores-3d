import type { EditorLike, ViewMode } from './types'

/** Última cámara 3D que publicó Pascal (`subscribeCameraPose`): solo lo que hace falta para girarla al norte. */
export type CameraLike = { target: readonly number[]; viewWidth?: number }
export type CameraPort = { latest(): CameraLike | null; subscribe(listener: () => void): () => void }

/**
 * El plano 2D de Pascal gira con el azimut de la cámara 3D (la 3D arranca en diagonal, 45°), así que al abrirlo se veía
 * rotado. Al entrar a 2D o a Ambas se pide la misma orden que el botón "norte arriba" de Pascal: una pose '2d' con azimut 0
 * sobre el mismo punto y ancho; si todavía no hay cámara, se hace con la primera que llegue. Después las órbitas de la
 * persona siguen girando el plano (es una función de Pascal).
 */
export function createPlanNorth(
  editor: { getState(): EditorLike; subscribe(listener: () => void): () => void },
  camera: CameraPort,
) {
  let waiting = false
  const faceNorth = () => {
    const cam = camera.latest()
    const width = cam?.viewWidth
    if (!(cam && width !== undefined && Number.isFinite(width) && width > 0)) {
      waiting = true
      return
    }
    waiting = false
    const [x = 0, y = 0, z = 0] = cam.target
    editor.getState().publishNavigationSyncPose({ source: '2d', target: [x, y, z], azimuth: 0, viewWidth: width })
  }
  let last: ViewMode | null = null
  return {
    /** Endereza la vista actual (si es 2D o Ambas) y vigila los cambios de vista; devuelve cómo dejar de vigilar. */
    start(): () => void {
      const stopCamera = camera.subscribe(() => {
        if (waiting) faceNorth()
      })
      last = editor.getState().viewMode
      if (last !== '3d') faceNorth()
      const stopView = editor.subscribe(() => {
        const view = editor.getState().viewMode
        if (view === last) return
        last = view
        if (view === '3d') waiting = false
        else faceNorth()
      })
      return () => {
        stopView()
        stopCamera()
      }
    },
  }
}
