import type { Face } from './font-coverage'

export type FontKey = `${Face}-${400 | 700}`

/** Rutas públicas de DM Sans para el PDF (`public/fonts/pdf/`, ver FUENTES.txt y OFL.txt). */
export const FONT_FILES: Record<FontKey, string> = {
  'latin-400': '/fonts/pdf/DMSans-latin-400.woff',
  'latin-700': '/fonts/pdf/DMSans-latin-700.woff',
  'ext-400': '/fonts/pdf/DMSans-latin-ext-400.woff',
  'ext-700': '/fonts/pdf/DMSans-latin-ext-700.woff',
}

export const fontKey = (face: Face, bold: boolean): FontKey => `${face}-${bold ? 700 : 400}` as FontKey
