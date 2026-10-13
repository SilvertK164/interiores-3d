/** Error de «Escena desde una foto» cuyo mensaje ya está escrito para personas: se muestra tal cual. */
export class LabError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

