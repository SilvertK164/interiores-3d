/** Qué chrome propio de Pascal se dibuja (propiedad `chrome` que agrega el parche; todo visible por omisión). */
export type PascalChrome = {
  dock?: boolean
  inspector?: boolean
  helpers?: boolean
  levelSelector?: boolean
}

/** Madori dibuja su propio dock, inspector, ayudantes y selector de nivel: los de Pascal no se muestran. */
export const HIDDEN_CHROME: Readonly<PascalChrome> = {
  dock: false,
  inspector: false,
  helpers: false,
  levelSelector: false,
}
