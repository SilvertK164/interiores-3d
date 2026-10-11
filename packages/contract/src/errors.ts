import { z } from 'zod'

export const ErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})
export type ErrorBody = z.infer<typeof ErrorBodySchema>

export const ERROR_CODES = {
  unauthorized: 'no_autenticado',
  notFound: 'no_encontrado',
  invalid: 'datos_invalidos',
  conflict: 'version_desactualizada',
  tooLarge: 'escena_demasiado_grande',
  preconditionRequired: 'falta_if_match',
  internal: 'error_interno',
} as const
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
