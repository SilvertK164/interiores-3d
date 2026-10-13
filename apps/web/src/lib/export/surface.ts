import { BRAND } from '../brand'
import type { PlanMode } from './types'

export type Paint = 'stroke' | 'fill' | 'both'
export type TextStyle = { size: number; bold?: boolean; color: string; align?: 'left' | 'center' | 'right' }
export type Transform = { tx: number; ty: number; sx: number; sy: number }

/**
 * Lo único que los dibujantes de la hoja saben del PDF. Todo en puntos con el origen arriba a la izquierda; `text` recibe la
 * línea de base. `src/editor/export/pdf-surface.ts` la implementa sobre `pdfkit`; las pruebas, con un registro.
 */
export interface PdfSurface {
  strokeColor(color: string): void
  fillColor(color: string): void
  lineWidth(widthPt: number): void
  rect(x: number, y: number, width: number, height: number, paint: Paint): void
  line(x1: number, y1: number, x2: number, y2: number): void
  /** `d` es un camino SVG (solo M, L, Q, C, H, V, A y Z absolutos); `rule: 'evenodd'` para anillos. */
  path(d: string, paint: Paint, rule?: 'evenodd'): void
  circle(cx: number, cy: number, r: number, paint: Paint): void
  polygon(points: readonly (readonly [number, number])[], paint: Paint): void
  text(value: string, x: number, baselineY: number, style: TextStyle): void
  widthOf(value: string, size: number, bold: boolean): number
  /** Dibuja con el origen movido y escalado; al terminar, colores y grosores vuelven a lo que eran. */
  withTransform(transform: Transform, draw: () => void): void
}

export type Palette = { ink: string; soft: string; sun: string | null; blank: string }

/** Papel: negro, gris y blanco. Color: Noche para el texto y el Sol solo en formas (nunca en texto). */
export function paletteFor(mode: PlanMode): Palette {
  return mode === 'paper'
    ? { ink: '#000000', soft: '#555555', sun: null, blank: '#ffffff' }
    : { ink: BRAND.noche, soft: '#5B6B8C', sun: BRAND.sol, blank: '#ffffff' }
}
