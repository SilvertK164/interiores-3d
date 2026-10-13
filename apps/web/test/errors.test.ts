import { describe, expect, it } from 'vitest'
import { ApiError } from '../src/lib/api/client.js'
import { friendlyMessage } from '../src/lib/api/errors.js'
import { TemplateError } from '../src/lib/templates/template-error'

describe('friendlyMessage', () => {
  it('traduce cada estado a castellano llano', () => {
    expect(friendlyMessage(new ApiError(401, 'no_autenticado', 'x'))).toMatch(/sesión/i)
    expect(friendlyMessage(new ApiError(404, 'no_encontrado', 'x'))).toMatch(/no encontramos/i)
    expect(friendlyMessage(new ApiError(409, 'version_desactualizada', 'x'))).toMatch(/otra pestaña|más nueva/i)
    expect(friendlyMessage(new ApiError(413, 'escena_demasiado_grande', 'x'))).toMatch(/4 MB/)
    expect(friendlyMessage(new ApiError(0, 'sin_conexion', 'x'))).toMatch(/conexión/i)
  })

  it('para un 422 usa el mensaje que ya viene de la API en castellano', () => {
    expect(friendlyMessage(new ApiError(422, 'datos_invalidos', 'Los datos enviados no son válidos: revisa name.'))).toBe(
      'Los datos enviados no son válidos: revisa name.',
    )
  })

  it('un error desconocido no filtra detalles técnicos', () => {
    expect(friendlyMessage(new Error('TypeError: x is undefined'))).toBe('Algo salió mal. Inténtalo de nuevo.')
    expect(friendlyMessage(new ApiError(500, 'error_interno', 'boom'))).toBe('Algo salió mal. Inténtalo de nuevo.')
  })

  it('muestra tal cual el mensaje de un error de plantilla, que ya está escrito para personas', () => {
    expect(friendlyMessage(new TemplateError('No pudimos cargar la plantilla. Revisa tu conexión e inténtalo de nuevo.'))).toBe(
      'No pudimos cargar la plantilla. Revisa tu conexión e inténtalo de nuevo.',
    )
  })
})
