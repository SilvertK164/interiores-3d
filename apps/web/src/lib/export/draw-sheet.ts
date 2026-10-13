import { drawLegend, drawNorth, drawScaleBar } from './draw-band'
import { drawBlock } from './draw-block'
import { type LegendEntry, buildLegend, sortLegend } from './legend'
import { type Sheet, mmToPt as pt } from './sheet'
import { type PdfSurface, paletteFor } from './surface'
import { sheetOf } from './texts-es'
import { layoutBand, layoutBlock } from './title-block'
import type { PlanMode, Scale } from './types'

export type SheetInput = {
  sheet: Sheet
  mode: PlanMode
  /** `null` = hoja isométrica: sin escala gráfica ni norte. */
  scale: Scale | null
  projectName: string
  /** Nombre de la planta ya en castellano ("Planta baja", "Planta 1", "Sótano 1"). */
  levelLabel: string
  author: string
  /** "12 de octubre de 2026". */
  dateText: string
  /** Número de esta hoja (desde 1) y total de hojas del PDF. */
  sheetNumber: number
  sheetTotal: number
  legend: readonly LegendEntry[]
}

/**
 * Dibuja todo lo que no es el plano: marco, línea de la banda, norte y escala gráfica (siempre), y, con cajetín, la leyenda
 * (solo en Color) y la caja con el logotipo. Se llama una vez por página, después del plano.
 */
export function drawSheet(s: PdfSurface, input: SheetInput): void {
  const palette = paletteFor(input.mode)
  const layout = layoutBand(input.sheet)
  const { frame, band } = layout
  s.strokeColor(palette.ink)
  s.lineWidth(0.5)
  s.rect(pt(frame.x), pt(frame.y), pt(frame.width), pt(frame.height), 'stroke')
  s.line(pt(band.x), pt(band.y), pt(band.x + band.width), pt(band.y))
  if (input.scale !== null) {
    drawNorth(s, layout.north, palette)
    drawScaleBar(s, layout.scaleBar, input.scale, palette)
  }
  if (layout.legend && input.mode === 'color') {
    const view = buildLegend(sortLegend(input.legend), layout.legendCapacity)
    drawLegend(s, layout.legend, view, layout.legendCols, layout.legendRows, palette)
  }
  if (layout.block) {
    drawBlock(
      s,
      layoutBlock(layout.block),
      {
        projectName: input.projectName,
        levelLabel: input.levelLabel,
        scale: input.scale,
        dateText: input.dateText,
        author: input.author,
        sheetText: sheetOf(input.sheetNumber, input.sheetTotal),
      },
      palette,
    )
  }
}
