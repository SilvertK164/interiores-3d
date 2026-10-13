import { ApiError } from './client'

/** Única capa que traduce errores técnicos a mensajes para personas. */
export function friendlyMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Algo salió mal. Inténtalo de nuevo.'
  switch (err.status) {
    case 0:
      return 'No hay conexión. Revisa tu internet; tus cambios siguen en esta pantalla.'
    case 401:
      return 'Tu sesión venció. Vuelve a ingresar para seguir guardando.'
    case 404:
      return 'No encontramos ese proyecto.'
    case 409:
      return 'Este proyecto cambió desde otra pestaña y tiene una versión más nueva.'
    case 413:
      return 'La escena supera el límite de 5 MB y no se puede guardar.'
    case 422:
      return err.message
    default:
      return 'Algo salió mal. Inténtalo de nuevo.'
  }
}
