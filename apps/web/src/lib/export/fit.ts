import { type Sheet, sheetFor } from './sheet'
import { type Extent, type Orientation, type PaperSize, SCALES, type Scale } from './types'

/** Metro de más que se suma a cada eje para que las cotas no salgan cortadas (D6). */
export const DIM_MARGIN_M = 1
const EPSILON_MM = 1e-6

export type FitResult = {
  fits: boolean
  /** Lo que ocupa el dibujo (más el margen de cotas) a esa escala, en milímetros. */
  neededMm: { width: number; height: number }
  /** Lo que ofrece el área útil de la hoja, en milímetros. */
  usableMm: { width: number; height: number }
  /** Porcentaje del eje más justo, redondeado al entero más cercano (puede pasar de 100). */
  percent: number
  axis: 'width' | 'height'
}

/** ¿Cabe `extent` (metros) en el área útil de `sheet` a la escala 1:`scale`? */
export function fitScale(extent: Extent, sheet: Sheet, scale: Scale): FitResult {
  const needed = {
    width: ((extent.widthM + DIM_MARGIN_M) * 1000) / scale,
    height: ((extent.heightM + DIM_MARGIN_M) * 1000) / scale,
  }
  const usable = { width: sheet.usable.width, height: sheet.usable.height }
  const ratioWidth = needed.width / usable.width
  const ratioHeight = needed.height / usable.height
  return {
    fits: needed.width <= usable.width + EPSILON_MM && needed.height <= usable.height + EPSILON_MM,
    neededMm: needed,
    usableMm: usable,
    percent: Math.round(Math.max(ratioWidth, ratioHeight) * 100),
    axis: ratioWidth >= ratioHeight ? 'width' : 'height',
  }
}

/** La escala mayor (menor denominador) en la que el edificio cabe, o `null` si no cabe en ninguna. */
export function largestFittingScale(extent: Extent, sheet: Sheet): Scale | null {
  for (const scale of SCALES) if (fitScale(extent, sheet, scale).fits) return scale
  return null
}

/** La orientación que permite la escala mayor; a igualdad (o si ninguna cabe), la que sigue la forma del edificio. */
export function suggestOrientation(extent: Extent, paper: PaperSize, titleBlock: boolean): Orientation {
  const byShape: Orientation = extent.widthM >= extent.heightM ? 'landscape' : 'portrait'
  const landscape = largestFittingScale(extent, sheetFor(paper, 'landscape', titleBlock))
  const portrait = largestFittingScale(extent, sheetFor(paper, 'portrait', titleBlock))
  if (landscape === null && portrait === null) return byShape
  if (landscape === null) return 'portrait'
  if (portrait === null) return 'landscape'
  if (landscape !== portrait) return landscape < portrait ? 'landscape' : 'portrait'
  return byShape
}

/** El máximo de cada eje entre las plantas (la escala es una sola para todo el PDF, D5). */
export function maxExtent(levels: readonly Extent[]): Extent {
  return levels.reduce<Extent>(
    (acc, level) => ({ widthM: Math.max(acc.widthM, level.widthM), heightM: Math.max(acc.heightM, level.heightM) }),
    { widthM: 0, heightM: 0 },
  )
}
