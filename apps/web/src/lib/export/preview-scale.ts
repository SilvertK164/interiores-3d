/** Escala de `pdfjs` para que la página (en puntos) llene un cuadro de `boxWidthCss` píxeles CSS con densidad `devicePixelRatio` (entre 1 y 2). */
export function canvasScale(boxWidthCss: number, pageWidthPt: number, devicePixelRatio: number): number {
  const density = Math.min(2, Math.max(1, devicePixelRatio))
  if (!(boxWidthCss > 0) || !(pageWidthPt > 0)) return 0.1
  return (boxWidthCss * density) / pageWidthPt
}
