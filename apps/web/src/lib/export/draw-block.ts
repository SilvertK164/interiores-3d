import { WINDOW } from '../brand'
import { fitText } from './fit-text'
import { LOGO } from './brand-paths'
import { type BoxMm, MM_TO_PT, mmToPt as pt } from './sheet'
import type { Palette, PdfSurface } from './surface'
import { TEXT, scaleText } from './texts-es'
import type { BlockLayout } from './title-block'
import type { Scale } from './types'

export type BlockData = {
  projectName: string
  levelLabel: string
  /** `null` = vista isométrica: sin escala. */
  scale: Scale | null
  dateText: string
  author: string
  /** "Hoja 1 de 2". */
  sheetText: string
}

/**
 * El marco de la ventana como contorno relleno y no como trazo de 11 unidades (así en Papel ninguna línea pasa de 0,7 pt): el borde
 * exterior es el camino central de `WINDOW.frame` desplazado 5,5 y el interior es `WINDOW.glass`; se rellena con la regla par-impar.
 * Si cambia `WINDOW`, recalcula el exterior (`export-draw-sheet.test.ts` lo vigila).
 */
const FRAME_OUTER = 'M1.5 46V32A30.5 30.5 0 0 1 62.5 32V46A17.5 17.5 0 0 1 45 63.5H19A17.5 17.5 0 0 1 1.5 46Z'
const FRAME_RING = `${FRAME_OUTER} ${WINDOW.glass}`

/** El logotipo de Madori (letras y ventana con el sol) ajustado a `box` (mm), alineado a la izquierda y centrado en vertical. */
export function drawLogo(s: PdfSurface, box: BoxMm, palette: Palette): void {
  const fit = Math.min(box.width / LOGO.box.width, box.height / LOGO.box.height)
  const k = fit * MM_TO_PT
  const tx = pt(box.x) - LOGO.box.minX * k
  const ty = pt(box.y) + pt((box.height - LOGO.box.height * fit) / 2) - LOGO.box.minY * k
  s.withTransform({ tx, ty, sx: k, sy: k }, () => {
    s.fillColor(palette.ink)
    for (const letters of LOGO.letters) s.path(letters, 'fill')
    const { x, y, width, height } = LOGO.window
    s.withTransform({ tx: x, ty: y, sx: width / 64, sy: height / 64 }, () => {
      s.fillColor(palette.ink)
      s.path(FRAME_RING, 'fill', 'evenodd')
      if (palette.sun) {
        s.fillColor(palette.sun)
        s.circle(WINDOW.sun.cx, WINDOW.sun.cy, WINDOW.sun.r, 'fill')
      } else {
        s.strokeColor(palette.ink)
        s.lineWidth(3)
        s.circle(WINDOW.sun.cx, WINDOW.sun.cy, WINDOW.sun.r, 'stroke')
      }
    })
  })
}

/** Un campo del cajetín: la etiqueta chica arriba y el valor (cortado con "…" si no cabe) abajo. */
function field(s: PdfSurface, box: BoxMm, label: string, value: string, size: number, bold: boolean, palette: Palette): void {
  s.text(label, pt(box.x), pt(box.y + 2.4), { size: 5, color: palette.soft })
  const fitted = fitText(value, pt(box.width - 1), (t) => s.widthOf(t, size, bold))
  s.text(fitted, pt(box.x), pt(box.y + box.height - 1.4), { size, bold, color: palette.ink })
}

/** La caja del cajetín: contorno, rayas, logotipo, "Hoja N de M" y los cinco campos. */
export function drawBlock(s: PdfSurface, layout: BlockLayout, data: BlockData, palette: Palette): void {
  const { outline } = layout
  s.strokeColor(palette.ink)
  s.lineWidth(0.5)
  s.rect(pt(outline.x), pt(outline.y), pt(outline.width), pt(outline.height), 'stroke')
  s.lineWidth(0.25)
  for (const line of layout.dividers) s.line(pt(line.x1), pt(line.y1), pt(line.x2), pt(line.y2))
  drawLogo(s, layout.logo, palette)
  const sheetText = fitText(data.sheetText, pt(layout.sheetNo.width), (t) => s.widthOf(t, 8, true))
  s.text(sheetText, pt(layout.sheetNo.x + layout.sheetNo.width), pt(layout.sheetNo.y + layout.sheetNo.height - 1.5), {
    size: 8,
    bold: true,
    color: palette.ink,
    align: 'right',
  })
  field(s, layout.project, TEXT.pdf.project, data.projectName, 10, true, palette)
  field(s, layout.level, TEXT.pdf.level, data.levelLabel, 7.5, false, palette)
  field(s, layout.scale, TEXT.pdf.scale, data.scale === null ? TEXT.pdf.noScale : scaleText(data.scale), 7.5, false, palette)
  field(s, layout.date, TEXT.pdf.date, data.dateText, 7.5, false, palette)
  field(s, layout.author, TEXT.pdf.author, data.author, 7.5, false, palette)
}
