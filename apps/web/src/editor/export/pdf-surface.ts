import { type Face, splitRuns } from '@/lib/export/font-coverage'
import { fontKey } from '@/lib/export/font-files'
import type { Paint, PdfSurface } from '@/lib/export/surface'
import type { PdfFontBytes } from './pdf-fonts'

/** Lo que se usa de un documento de `pdfkit` (el real se pasa con un `as unknown as PdfRawLike`: así este archivo no importa `pdfkit`). */
export type PdfRawLike = {
  save(): PdfRawLike
  restore(): PdfRawLike
  translate(x: number, y: number): PdfRawLike
  scale(x: number, y?: number): PdfRawLike
  rect(x: number, y: number, width: number, height: number): PdfRawLike
  moveTo(x: number, y: number): PdfRawLike
  lineTo(x: number, y: number): PdfRawLike
  path(d: string): PdfRawLike
  circle(x: number, y: number, r: number): PdfRawLike
  polygon(...points: [number, number][]): PdfRawLike
  fill(color?: string, rule?: string): PdfRawLike
  stroke(color?: string): PdfRawLike
  fillAndStroke(fill?: string, stroke?: string, rule?: string): PdfRawLike
  fillColor(color: string): PdfRawLike
  strokeColor(color: string): PdfRawLike
  lineWidth(width: number): PdfRawLike
  font(name: string): PdfRawLike
  fontSize(size: number): PdfRawLike
  text(value: string, x: number, y: number, options?: { lineBreak?: boolean }): PdfRawLike
  widthOfString(value: string, options?: { lineBreak?: boolean }): number
  registerFont(name: string, source: ArrayBuffer | Uint8Array): PdfRawLike
  addPage(options?: { size?: [number, number]; margin?: number }): PdfRawLike
  image(source: ArrayBuffer, x: number, y: number, options?: { fit?: [number, number]; align?: string; valign?: string }): PdfRawLike
  /** Metadatos del documento (`Title`, `Author`, `Creator`). */
  info?: Record<string, unknown>
  /** Interno de `pdfkit`: la fuente en uso, con su ascendente en milésimas de em. */
  _font?: { ascender?: number }
}

const NAMES: Record<string, string> = {
  'latin-400': 'madori-latin-400',
  'latin-700': 'madori-latin-700',
  'ext-400': 'madori-ext-400',
  'ext-700': 'madori-ext-700',
}

/** Registra las cuatro variantes de DM Sans en el documento. Se llama una vez, desde `setup` del parche. */
export function registerPdfFonts(raw: PdfRawLike, bytes: PdfFontBytes): void {
  for (const [key, name] of Object.entries(NAMES)) raw.registerFont(name, bytes[key as keyof PdfFontBytes])
}

/**
 * La superficie de dibujo sobre un documento de `pdfkit`. El texto se reparte en tramos (DM Sans latina y extendida) con
 * `splitRuns`; con `fonts: 'helvetica'` (respaldo de la Tarea 0) usa la fuente estándar y lo que no es Latin-1 sale "?".
 */
export function createPdfSurface(raw: PdfRawLike, fonts: 'dmsans' | 'helvetica' = 'dmsans'): PdfSurface {
  const faces: readonly Face[] = fonts === 'dmsans' ? ['latin', 'ext'] : ['latin']
  let fill = '#000000'
  let stroke = '#000000'

  const select = (face: Face, bold: boolean, size: number) => {
    raw.font(fonts === 'dmsans' ? (NAMES[fontKey(face, bold)] ?? 'Helvetica') : bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
  }
  const measure = (value: string, size: number, bold: boolean) =>
    splitRuns(value, faces).reduce((total, run) => {
      select(run.face, bold, size)
      return total + raw.widthOfString(run.text, { lineBreak: false })
    }, 0)
  const paint = (kind: Paint, rule?: 'evenodd') => {
    const name = rule === 'evenodd' ? 'even-odd' : undefined
    if (kind === 'fill') raw.fill(fill, name)
    else if (kind === 'stroke') raw.stroke(stroke)
    else raw.fillAndStroke(fill, stroke, name)
  }

  return {
    strokeColor: (color) => {
      stroke = color
      raw.strokeColor(color)
    },
    fillColor: (color) => {
      fill = color
      raw.fillColor(color)
    },
    lineWidth: (width) => {
      raw.lineWidth(width)
    },
    rect: (x, y, width, height, kind) => {
      raw.rect(x, y, width, height)
      paint(kind)
    },
    line: (x1, y1, x2, y2) => {
      raw.moveTo(x1, y1).lineTo(x2, y2)
      raw.stroke(stroke)
    },
    path: (d, kind, rule) => {
      raw.path(d)
      paint(kind, rule)
    },
    circle: (cx, cy, r, kind) => {
      raw.circle(cx, cy, r)
      paint(kind)
    },
    polygon: (points, kind) => {
      raw.polygon(...points.map(([x, y]) => [x, y] as [number, number]))
      paint(kind)
    },
    text: (value, x, baselineY, style) => {
      const bold = style.bold === true
      const total = measure(value, style.size, bold)
      let cursor = style.align === 'center' ? x - total / 2 : style.align === 'right' ? x - total : x
      raw.fillColor(style.color)
      for (const run of splitRuns(value, faces)) {
        select(run.face, bold, style.size)
        const ascent = ((raw._font?.ascender ?? 780) / 1000) * style.size
        raw.text(run.text, cursor, baselineY - ascent, { lineBreak: false })
        cursor += raw.widthOfString(run.text, { lineBreak: false })
      }
      raw.fillColor(fill)
    },
    widthOf: measure,
    withTransform: (transform, draw) => {
      const saved = { fill, stroke }
      raw.save()
      raw.translate(transform.tx, transform.ty).scale(transform.sx, transform.sy)
      draw()
      raw.restore()
      fill = saved.fill
      stroke = saved.stroke
    },
  }
}
