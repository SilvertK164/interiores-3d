import { formatArea } from '../format'
import { fitText } from './fit-text'
import type { LegendEntry, LegendView } from './legend'
import { pickScaleBar } from './scale-bar'
import { type BoxMm, mmToPt as pt } from './sheet'
import type { Palette, PdfSurface } from './surface'
import { TEXT, moreText, scaleText } from './texts-es'
import { LEGEND_ROW_MM, LEGEND_TITLE_MM } from './title-block'
import type { Scale } from './types'

/** Flecha del norte (apunta arriba) con una "N" encima, centrada en su caja de 12 × 14 mm. */
export function drawNorth(s: PdfSurface, box: BoxMm, palette: Palette): void {
  const cx = box.x + box.width / 2
  const bottom = box.y + box.height - 0.5
  s.text(TEXT.pdf.north, pt(cx), pt(box.y + 4), { size: 8, bold: true, color: palette.ink, align: 'center' })
  s.fillColor(palette.ink)
  s.strokeColor(palette.ink)
  s.lineWidth(0.5)
  s.polygon([[pt(cx), pt(box.y + 5.5)], [pt(cx - 3), pt(bottom)], [pt(cx), pt(bottom - 3)], [pt(cx + 3), pt(bottom)]], 'fill')
}

/** Barra de escala de 4 tramos alternados, con su largo en metros y "Escala 1:50" debajo. */
export function drawScaleBar(s: PdfSurface, box: BoxMm, scale: Scale, palette: Palette): void {
  const bar = pickScaleBar(scale, { maxMm: box.width - 5 })
  const x0 = box.x + 2
  const top = box.y + 6.5
  const segment = bar.lengthMm / bar.segments
  s.strokeColor(palette.ink)
  s.lineWidth(0.5)
  for (let i = 0; i < bar.segments; i++) {
    s.fillColor(i % 2 === 0 ? palette.ink : palette.blank)
    s.rect(pt(x0 + i * segment), pt(top), pt(segment), pt(2), 'both')
  }
  for (const tick of bar.ticks) {
    s.text(tick.label, pt(x0 + tick.atMm), pt(box.y + 5), { size: 6, color: palette.ink, align: 'center' })
  }
  s.text(`${TEXT.pdf.scale} ${scaleText(scale)}`, pt(x0), pt(box.y + 13), { size: 6.5, bold: true, color: palette.ink })
}

/** "Sala · 15,2 m²" para un ambiente y "Piso: Madera" para un material. */
export function legendLabel(entry: LegendEntry): string {
  if (entry.kind === 'material') return `${TEXT.pdf.floor}: ${entry.label}`
  return entry.areaM2 === undefined ? entry.label : `${entry.label} · ${formatArea(entry.areaM2)}`
}

/** Leyenda de Color: muestra, nombre y m² de cada ambiente; la última fila es "y N más" si no entran todos. */
export function drawLegend(s: PdfSurface, box: BoxMm, view: LegendView, cols: number, rows: number, palette: Palette): void {
  const colW = box.width / Math.max(1, cols)
  const top = box.y + 2 + LEGEND_TITLE_MM
  s.text(TEXT.pdf.legend, pt(box.x + 2), pt(box.y + 5.5), { size: 6.5, bold: true, color: palette.ink })
  const place = (index: number) => ({ x: box.x + Math.floor(index / rows) * colW, y: top + (index % rows) * LEGEND_ROW_MM })
  const label = (text: string, x: number, y: number, color: string) => {
    const fitted = fitText(text, pt(colW - 8), (t) => s.widthOf(t, 6, false))
    s.text(fitted, pt(x + 6.2), pt(y + 4.2), { size: 6, color })
  }
  if (view.shown.length === 0 && view.more === 0) {
    s.text(TEXT.pdf.noZones, pt(box.x + 2), pt(top + 4.2), { size: 6, color: palette.soft })
    return
  }
  view.shown.forEach((entry, index) => {
    const { x, y } = place(index)
    s.fillColor(entry.color)
    s.strokeColor(palette.ink)
    s.lineWidth(0.25)
    s.rect(pt(x + 2), pt(y + 1.4), pt(3.2), pt(3.2), 'both')
    label(legendLabel(entry), x, y, palette.ink)
  })
  if (view.more > 0) {
    const { x, y } = place(view.shown.length)
    s.text(moreText(view.more), pt(x + 2), pt(y + 4.2), { size: 6, color: palette.soft })
  }
}
