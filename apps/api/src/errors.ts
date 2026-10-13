import { ANALYZE_IMAGE_MAX_BYTES, ERROR_CODES, type ErrorBody } from '@interiores/contract'

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export const errors = {
  unauthorized: () => new AppError(401, ERROR_CODES.unauthorized, 'Tu sesión no es válida o venció. Vuelve a ingresar.'),
  notFound: () => new AppError(404, ERROR_CODES.notFound, 'No encontramos ese proyecto.'),
  invalid: (detail: string) => new AppError(422, ERROR_CODES.invalid, `Los datos enviados no son válidos: ${detail}.`),
  conflict: () =>
    new AppError(
      409,
      ERROR_CODES.conflict,
      'El proyecto cambió desde que lo abriste. Recarga la versión del servidor o sigue editando sin guardar.',
    ),
  tooLarge: () => new AppError(413, ERROR_CODES.tooLarge, 'La escena supera el límite de 4 MB.'),
  preconditionRequired: () =>
    new AppError(428, ERROR_CODES.preconditionRequired, 'Falta el encabezado If-Match con la versión que tienes abierta.'),
  internal: () => new AppError(500, ERROR_CODES.internal, 'Ocurrió un error inesperado. Inténtalo de nuevo.'),

  // Análisis de fotos (POST /v1/analyze-room): lo que se le dice a la persona, sin nombres del proveedor ni de la configuración.
  analysisUnavailable: () =>
    new AppError(503, ERROR_CODES.analysisUnavailable, 'El análisis de fotos no está disponible por ahora. Inténtalo más tarde.'),
  invalidCatalog: () =>
    new AppError(422, ERROR_CODES.invalidCatalog, 'La lista de muebles del catálogo no es válida. Recarga la página e inténtalo de nuevo.'),
  unreadableImage: () =>
    new AppError(422, ERROR_CODES.unreadableImage, 'No pudimos leer la foto. Prueba con otra imagen en formato JPG, PNG o WebP.'),
  imageTooLarge: () =>
    new AppError(413, ERROR_CODES.imageTooLarge, `La foto supera el límite de ${ANALYZE_IMAGE_MAX_BYTES / (1024 * 1024)} MB. Prueba con una más liviana.`),
}

export function errorBody(code: string, message: string): ErrorBody {
  return { error: { code, message } }
}
