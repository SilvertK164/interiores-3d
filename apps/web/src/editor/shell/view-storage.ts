import type { ViewMode } from './bridge/types'

/** Clave propia de Madori: Pascal también guarda la vista, pero sus propios paneles la pisan con el valor por defecto antes de rehidratar. */
export const VIEW_STORAGE_KEY = 'madori-editor-view'

export type ViewStore = { read(): ViewMode | null; write(view: ViewMode): void }

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function parseStoredView(raw: string | null): ViewMode | null {
  return raw === '2d' || raw === '3d' || raw === 'split' ? raw : null
}

/** Guarda la vista 2D / 3D / Ambas; si el almacenamiento falta o falla (modo privado, bloqueado) simplemente no conserva nada. */
export function createViewStorage(
  getStorage: () => StorageLike | null = () => (typeof window === 'undefined' ? null : window.localStorage),
): ViewStore {
  return {
    read() {
      try {
        return parseStoredView(getStorage()?.getItem(VIEW_STORAGE_KEY) ?? null)
      } catch {
        return null
      }
    },
    write(view) {
      try {
        getStorage()?.setItem(VIEW_STORAGE_KEY, view)
      } catch {
        // sin almacenamiento: la vista no se conserva, nada más
      }
    },
  }
}
