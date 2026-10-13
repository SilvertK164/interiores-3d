export type ExportDecisions = {
  /** M5: quién escribe los m² de cada ambiente. 'pascal' = ya vienen en su etiqueta; 'madori' = los agrega `extraGeometry` (Tarea 12b). */
  areaLabels: 'pascal' | 'madori'
  /** M8: 'dmsans' incrusta DM Sans (woff); 'helvetica' usa la fuente estándar del PDF (respaldo: solo Latin-1). */
  fonts: 'dmsans' | 'helvetica'
  /** M10: 'pdfjs' dibuja la página real con pdfjs-dist; 'frame' muestra solo el cuadro con el tamaño de la hoja y el porcentaje. */
  previewMode: 'pdfjs' | 'frame'
  /** M4: espera (ms) tras un cambio de opción antes de pedir la vista previa. */
  previewDelayMs: number
}

/** Lo que midió la Tarea 0 (tabla "Resultados de la Tarea 0" del plan 2026-10-12-exportar-plano.md). */
export const EXPORT_DECISIONS: ExportDecisions = {
  areaLabels: 'madori',
  fonts: 'dmsans',
  previewMode: 'pdfjs',
  previewDelayMs: 250,
}
