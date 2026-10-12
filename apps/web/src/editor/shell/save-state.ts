import type { SaverStatus } from '../scene-saver'
import type { SaveState } from './ui/status'

/**
 * Estado del guardador (`scene-saver`) → chip de la barra superior. Un rechazo del servidor y la sesión vencida muestran
 * "Sin guardar": el aviso de `SaveBanner` explica qué hacer sin perder lo local.
 */
export function saveStateOf(status: SaverStatus): SaveState {
  switch (status) {
    case 'idle':
      return 'sin-cambios'
    case 'pending':
    case 'saving':
      return 'guardando'
    case 'saved':
      return 'guardado'
    case 'error':
      return 'sin-conexion'
    case 'conflict':
      return 'conflicto'
    case 'unauthorized':
    case 'rejected':
      return 'sin-guardar'
  }
}
