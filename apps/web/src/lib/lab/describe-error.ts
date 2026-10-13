import { friendlyMessage } from '../api/errors'
import { LabError } from './lab-error'

/** Mensaje para mostrar en pantalla: los errores de la escena desde una foto ya vienen en castellano; el resto pasa por la capa común. */
export function describeLabError(error: unknown): string {
  return error instanceof LabError ? error.message : friendlyMessage(error)
}
