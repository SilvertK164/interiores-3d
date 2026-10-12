import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

/**
 * `pdfkit` 0.19.1 sin sumarlo como dependencia de la web: es el que trae `@pascal-app/editor` (el mismo que corre en el
 * navegador cuando Pascal exporta). Se resuelve desde la carpeta real del editor porque pnpm no lo expone en `apps/web`.
 */
const editorPackage = realpathSync(
  fileURLToPath(new URL('../../node_modules/@pascal-app/editor/package.json', import.meta.url)),
)
const load = createRequire(editorPackage)

/** Solo los métodos que usan las pruebas; todos devuelven el documento para poder encadenar. */
export interface PdfKitDoc {
  on(event: 'data', listener: (chunk: Buffer) => void): PdfKitDoc
  on(event: 'end', listener: () => void): PdfKitDoc
  addPage(options?: { size?: [number, number]; margin?: number }): PdfKitDoc
  end(): void
  save(): PdfKitDoc
  restore(): PdfKitDoc
  fillColor(color: string): PdfKitDoc
  strokeColor(color: string): PdfKitDoc
  lineWidth(width: number): PdfKitDoc
  rect(x: number, y: number, width: number, height: number): PdfKitDoc
  circle(x: number, y: number, radius: number): PdfKitDoc
  moveTo(x: number, y: number): PdfKitDoc
  lineTo(x: number, y: number): PdfKitDoc
  fill(color?: string, rule?: string): PdfKitDoc
  stroke(color?: string): PdfKitDoc
  fillAndStroke(fill?: string, stroke?: string): PdfKitDoc
}

export const PDFDocument = load('pdfkit') as new (options?: Record<string, unknown>) => PdfKitDoc
