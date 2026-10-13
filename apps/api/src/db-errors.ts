import { ERROR_CODES } from '@interiores/contract'
import { AppError, errors } from './errors.js'

type DbError = { code?: string; message?: string }

/** SQLSTATE `configuration_limit_exceeded`: lo lanza el disparador de la migración 003 al llegar a 50 proyectos. */
export const PROJECT_LIMIT_SQLSTATE = '53400'

/**
 * Traduce los rechazos de las restricciones de la base (migración 003) a respuestas 4xx en castellano.
 * Cualquier otro error se devuelve igual para que termine en 500 sin filtrar detalles.
 */
export function mapDbError<T>(err: T): T | AppError {
  const { code, message } = (err ?? {}) as DbError
  if (code === PROJECT_LIMIT_SQLSTATE) {
    return new AppError(422, ERROR_CODES.projectLimit, message || 'Llegaste al límite de proyectos. Borra alguno para crear otro.')
  }
  if (code === '23514') {
    if (message?.includes('project_scenes_scene_size')) return errors.tooLarge()
    if (message?.includes('project_scenes_scene_shape')) return errors.invalid('la escena no tiene la forma esperada')
    if (message?.includes('projects_name_clean')) return errors.invalid('el nombre debe tener entre 1 y 80 caracteres y ningún carácter de control')
    return errors.invalid('un dato no cumple las reglas de la base')
  }
  return err
}
