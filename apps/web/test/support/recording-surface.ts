import type { PdfSurface, TextStyle } from '../../src/lib/export/surface'

export type Call = { op: string; args: unknown[]; depth: number }
export type RecordedText = { value: string; x: number; y: number; style: TextStyle; depth: number }

/** Una superficie de mentira que anota cada dibujo. `depth` cuenta las transformaciones abiertas (el logotipo dibuja en sus propias unidades). */
export function createRecorder() {
  const calls: Call[] = []
  const texts: RecordedText[] = []
  let depth = 0
  const log = (op: string, ...args: unknown[]) => {
    calls.push({ op, args, depth })
  }
  const widthOf = (value: string, size: number, bold: boolean) => [...value].length * size * (bold ? 0.58 : 0.5)
  const surface: PdfSurface = {
    strokeColor: (color) => log('strokeColor', color),
    fillColor: (color) => log('fillColor', color),
    lineWidth: (width) => log('lineWidth', width),
    rect: (x, y, width, height, paint) => log('rect', x, y, width, height, paint),
    line: (x1, y1, x2, y2) => log('line', x1, y1, x2, y2),
    path: (d, paint, rule) => log('path', d, paint, rule),
    circle: (cx, cy, r, paint) => log('circle', cx, cy, r, paint),
    polygon: (points, paint) => log('polygon', points, paint),
    text: (value, x, y, style) => {
      texts.push({ value, x, y, style, depth })
      log('text', value, x, y, style)
    },
    widthOf,
    withTransform: (transform, draw) => {
      log('transform', transform)
      depth += 1
      draw()
      depth -= 1
    },
  }
  return { surface, calls, texts, widthOf }
}

/** Todos los colores que se pidieron: de trazo, de relleno y de texto. */
export function colorsUsed(recorder: ReturnType<typeof createRecorder>): Set<string> {
  const colors = new Set<string>()
  for (const call of recorder.calls) {
    if (call.op === 'strokeColor' || call.op === 'fillColor') colors.add(String(call.args[0]))
  }
  for (const text of recorder.texts) colors.add(text.style.color)
  return colors
}
