import type { Orientation, PaperSize } from './types'

export const MM_TO_PT = 72 / 25.4
export const mmToPt = (mm: number): number => mm * MM_TO_PT
export const ptToMm = (pt: number): number => pt / MM_TO_PT

/** Margen de la hoja por lado, banda inferior con cajetín y banda inferior sin cajetín (solo norte y escala gráfica). */
export const MARGIN_MM = 10
export const BAND_MM = 36
export const BAND_PLAIN_MM = 16

/** Una caja en milímetros con el origen arriba a la izquierda de la hoja. */
export type BoxMm = { x: number; y: number; width: number; height: number }

export type Sheet = {
  paper: PaperSize
  orientation: Orientation
  titleBlock: boolean
  widthMm: number
  heightMm: number
  widthPt: number
  heightPt: number
  /** Alto de la banda inferior (norte, escala gráfica, leyenda y cajetín). */
  bandMm: number
  /** Donde va el plano: la hoja menos el margen por lado y la banda. */
  usable: BoxMm
}

const LANDSCAPE_MM: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 },
}

export function sheetFor(paper: PaperSize, orientation: Orientation, titleBlock = true): Sheet {
  const base = LANDSCAPE_MM[paper]
  const widthMm = orientation === 'landscape' ? base.width : base.height
  const heightMm = orientation === 'landscape' ? base.height : base.width
  const bandMm = titleBlock ? BAND_MM : BAND_PLAIN_MM
  return {
    paper,
    orientation,
    titleBlock,
    widthMm,
    heightMm,
    widthPt: mmToPt(widthMm),
    heightPt: mmToPt(heightMm),
    bandMm,
    usable: {
      x: MARGIN_MM,
      y: MARGIN_MM,
      width: widthMm - 2 * MARGIN_MM,
      height: heightMm - 2 * MARGIN_MM - bandMm,
    },
  }
}

/** "A4 apaisada" o "A3 vertical". */
export function paperLabel(paper: PaperSize, orientation: Orientation): string {
  return `${paper} ${orientation === 'landscape' ? 'apaisada' : 'vertical'}`
}
