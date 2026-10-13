import { ANALYSES_PER_HOUR, ANALYZE_IMAGE_MAX_BYTES, ERROR_CODES } from '@interiores/contract'
import { TemplateError } from '../templates/template-error'
import { ApiError } from './client'
import { PhotoError } from './photo'

const GENERIC = 'Algo salió mal. Inténtalo de nuevo.'
const TOO_SLOW = 'El análisis tardó demasiado. Inténtalo de nuevo.'

/**
 * Los errores del análisis de fotos, por código (el estado HTTP solo no alcanza: un 413 o un 422 también existen en las escenas).
 * Son los mismos textos de `apps/api/src/errors.ts`, que aquí no se muestran tal cual: esta es la única capa que escribe lo que
 * ve la persona. `tiempo_agotado` lo genera el propio cliente cuando la API no responde.
 */
const ANALYSIS_MESSAGES: Record<string, string> = {
  [ERROR_CODES.analysisUnavailable]: 'El análisis de fotos no está disponible por ahora. Inténtalo más tarde.',
  [ERROR_CODES.analysisFailed]: 'No pudimos analizar la foto en este momento. Inténtalo de nuevo en unos minutos.',
  [ERROR_CODES.invalidCatalog]: 'No pudimos preparar la lista de muebles. Recarga la página e inténtalo de nuevo.',
  [ERROR_CODES.unreadableImage]: 'No pudimos leer la foto. Prueba con otra imagen en formato JPG, PNG o WebP.',
  [ERROR_CODES.imageTooLarge]: `La foto supera el límite de ${ANALYZE_IMAGE_MAX_BYTES / (1024 * 1024)} MB. Prueba con una más liviana.`,
  [ERROR_CODES.analysisLimit]: `Llegaste al límite de ${ANALYSES_PER_HOUR} análisis por hora. Inténtalo más tarde.`,
  tiempo_agotado: TOO_SLOW,
}

/** Única capa que traduce errores técnicos a mensajes para personas. */
export function friendlyMessage(err: unknown): string {
  if (err instanceof TemplateError || err instanceof PhotoError) return err.message
  if (!(err instanceof ApiError)) return GENERIC
  const analysis = ANALYSIS_MESSAGES[err.code]
  if (analysis) return analysis
  switch (err.status) {
    case 0:
      return 'No hay conexión. Revisa tu internet; tus cambios siguen en esta pantalla.'
    case 401:
      return 'Tu sesión venció. Vuelve a ingresar para continuar.'
    case 404:
      return 'No encontramos ese proyecto.'
    case 409:
      return 'Este proyecto cambió desde otra pestaña y tiene una versión más nueva.'
    case 413:
      return 'La escena supera el límite de 4 MB y no se puede guardar.'
    case 422:
      return err.message
    case 504:
      return TOO_SLOW
    default:
      return GENERIC
  }
}
