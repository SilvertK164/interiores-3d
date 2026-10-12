import { type BoxMm, MARGIN_MM, type Sheet } from './sheet'

/** Alto del título "Leyenda" y de cada fila de la leyenda, en mm. */
export const LEGEND_TITLE_MM = 5
export const LEGEND_ROW_MM = 6

const PAD_MM = 2
const NORTH_W = 12
const NORTH_H = 14
const NORTH_GAP = 4
const ZONE_W = 75
const ZONE_W_NARROW = 50
const BLOCK_W = 110
const BLOCK_W_NARROW = 90
const NARROW_BELOW_MM = 250
const LEGEND_COL_W = 45
const LEGEND_MAX_COLS = 3
const LEGEND_ROWS = 4

export type BandLayout = {
  /** Marco de la hoja (a 10 mm del borde). */
  frame: BoxMm
  /** Banda inferior donde viven norte, escala gráfica, leyenda y cajetín. */
  band: BoxMm
  north: BoxMm
  scaleBar: BoxMm
  legend: BoxMm | null
  block: BoxMm | null
  legendCols: number
  legendRows: number
  legendCapacity: number
  /** Largo máximo de la barra de escala gráfica en esta hoja, en mm. */
  barMaxMm: number
}

/** Reparte la banda inferior de la hoja (spec 5.3). Todo en mm con el origen arriba a la izquierda de la hoja. */
export function layoutBand(sheet: Sheet): BandLayout {
  const left = MARGIN_MM
  const right = sheet.widthMm - MARGIN_MM
  const top = sheet.heightMm - MARGIN_MM - sheet.bandMm
  const band: BoxMm = { x: left, y: top, width: right - left, height: sheet.bandMm }
  const frame: BoxMm = { x: MARGIN_MM, y: MARGIN_MM, width: sheet.widthMm - 2 * MARGIN_MM, height: sheet.heightMm - 2 * MARGIN_MM }
  const narrow = band.width < NARROW_BELOW_MM
  const zoneW = narrow ? ZONE_W_NARROW : ZONE_W
  const blockW = sheet.titleBlock ? (narrow ? BLOCK_W_NARROW : BLOCK_W) : 0

  const north: BoxMm = { x: left + PAD_MM, y: top + (band.height - NORTH_H) / 2, width: NORTH_W, height: NORTH_H }
  const barX = north.x + NORTH_W + NORTH_GAP
  const scaleBar: BoxMm = { x: barX, y: north.y, width: left + zoneW - PAD_MM - barX, height: NORTH_H }

  const block: BoxMm | null = blockW > 0 ? { x: right - blockW, y: top, width: blockW, height: band.height } : null
  const legendX = left + zoneW
  const legendW = (block ? block.x : right) - legendX
  const legendCols = sheet.titleBlock ? Math.min(LEGEND_MAX_COLS, Math.floor(legendW / LEGEND_COL_W)) : 0
  const legend: BoxMm | null = legendCols > 0 ? { x: legendX, y: top, width: legendW, height: band.height } : null

  return {
    frame,
    band,
    north,
    scaleBar,
    legend,
    block,
    legendCols,
    legendRows: legend ? LEGEND_ROWS : 0,
    legendCapacity: legend ? legendCols * LEGEND_ROWS : 0,
    barMaxMm: scaleBar.width,
  }
}

export type BlockLayout = {
  outline: BoxMm
  logo: BoxMm
  sheetNo: BoxMm
  project: BoxMm
  level: BoxMm
  scale: BoxMm
  date: BoxMm
  author: BoxMm
  /** Rayas finas entre filas y entre columnas, en mm. */
  dividers: { x1: number; y1: number; x2: number; y2: number }[]
}

/** Reparte la caja del cajetín (110 × 36 mm, o 90 × 36 en la hoja angosta): logotipo y hoja arriba, proyecto, y dos filas de dos campos. */
export function layoutBlock(block: BoxMm): BlockLayout {
  const pad = 3
  const x0 = block.x + pad
  const innerW = block.width - 2 * pad
  const leftW = innerW * 0.6
  const rowC = block.y + 21
  const rowD = block.y + 28.5
  const rowH = 7.5
  return {
    outline: block,
    logo: { x: x0, y: block.y + 2.5, width: Math.min(40, innerW * 0.4), height: 7 },
    sheetNo: { x: block.x + block.width - pad - 30, y: block.y + 2.5, width: 30, height: 7 },
    project: { x: x0, y: block.y + 11, width: innerW, height: 10 },
    level: { x: x0, y: rowC, width: leftW - 2, height: rowH },
    scale: { x: x0 + leftW, y: rowC, width: innerW - leftW, height: rowH },
    date: { x: x0, y: rowD, width: leftW - 2, height: rowH },
    author: { x: x0 + leftW, y: rowD, width: innerW - leftW, height: rowH },
    dividers: [
      { x1: block.x, y1: block.y + 11, x2: block.x + block.width, y2: block.y + 11 },
      { x1: block.x, y1: rowC, x2: block.x + block.width, y2: rowC },
      { x1: block.x, y1: rowD, x2: block.x + block.width, y2: rowD },
      { x1: x0 + leftW - 1, y1: rowC, x2: x0 + leftW - 1, y2: block.y + block.height },
    ],
  }
}
