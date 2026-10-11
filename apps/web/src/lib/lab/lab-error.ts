/** Error del laboratorio cuyo mensaje ya está escrito para personas: se muestra tal cual. */
export class LabError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

/** El modelado con Pascal (`analysisToDefinition`) todavía está en blanco; el mensaje invita a seguir, no es una falla. */
export class LabNotImplementedError extends LabError {
  constructor(
    message = 'Aquí va el modelado con Pascal: analysisToDefinition todavía está en blanco (es parte del Laboratorio de Victoria, ver lab/README.md).',
  ) {
    super(message, 'no_implementado')
  }
}
