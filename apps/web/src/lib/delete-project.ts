import type { ProjectSummary } from '@interiores/contract'
import { friendlyMessage } from './api/errors'

export const PROJECT_DELETED_NOTICE = 'Proyecto eliminado'

/** Nombre del botón «…» de cada tarjeta. */
export const menuLabel = (name: string) => `Más opciones del proyecto ${name}`

/** Lo que pregunta el diálogo de confirmación (un solo texto: el nombre va entre comillas angulares). */
export const deleteQuestion = (name: string) =>
  `¿Eliminar «${name}»? Se borra con todo lo que tiene dentro y no se puede deshacer.`

/** La lista sin ese proyecto (`null` mientras la lista aún carga). */
export const withoutProject = (list: ProjectSummary[] | null, id: string): ProjectSummary[] | null =>
  list === null ? null : list.filter((p) => p.id !== id)

/** A qué ítem va el foco con esa tecla en un menú vertical (con vuelta); `null` si la tecla no mueve nada. `current` es -1 sin foco. */
export function menuStep(key: string, current: number, count: number): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowDown':
      return (current + 1) % count
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

export type DeleteOutcome = { ok: true } | { ok: false; message: string }

/**
 * Borra un proyecto de a uno: mientras hay un borrado en curso, otro clic no hace nada (devuelve `null`) y la API se llama una sola vez.
 * Un error vuelve como texto en castellano (`friendlyMessage`), no como excepción.
 */
export function createProjectDeleter(remove: (id: string) => Promise<void>) {
  let running = false
  return async (id: string): Promise<DeleteOutcome | null> => {
    if (running) return null
    running = true
    try {
      await remove(id)
      return { ok: true }
    } catch (e) {
      return { ok: false, message: friendlyMessage(e) }
    } finally {
      running = false
    }
  }
}
