/** Resultados del spike de la Tarea 0 (ver "Resultados del spike" del plan y docs/pascal-notes.md). Las tareas leen solo este archivo. */
export type Decisions = {
  /** (a) 'patch' = parche de `pnpm patch`; 'css' = respaldo: CSS que oculta los bloques de Pascal por sus clases (Tarea 3b). */
  chromeStrategy: 'patch' | 'css'
  /** (b) true = Recorrer (primera persona con puntero bloqueado) funciona; false = el botón se oculta. */
  walkthrough: boolean
  /** (c) Cámara perspectiva/isométrica en Vista 3D: false = el grupo se oculta (D7). */
  cameraControl: boolean
  /** (c) Estilo sólido/realista en Vista 3D: false = el grupo se oculta (D7). */
  styleControl: boolean
  /** (d) true = antes de colocar un mueble se pasa a la fase `furnish`. */
  furnishPhaseBeforeItem: boolean
  /** (e) false = el menú Estructura no ofrece Ambiente. */
  zoneTool: boolean
  /** (f) 'temporal' = el historial se lee de `useScene.temporal` en lugar de `getHistoryCommandState`. */
  historySource: 'pascal' | 'temporal'
}

export const DECISIONS: Decisions = {
  chromeStrategy: 'patch',
  walkthrough: true,
  cameraControl: true,
  styleControl: true,
  furnishPhaseBeforeItem: true,
  zoneTool: true,
  historySource: 'pascal',
}
