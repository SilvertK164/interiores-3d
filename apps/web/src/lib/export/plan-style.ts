import { BRAND } from '../brand'
import type { PlanMode } from './types'

/** Forma mínima de una geometría del plano de Pascal (`FloorplanGeometry`): lo único que el estilo necesita saber. */
export type GeoLike = {
  kind: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  fillOpacity?: number
  strokeOpacity?: number
  opacity?: number
  vectorEffect?: string
  strokeDasharray?: string
  paintOrder?: string
  fontSize?: number
  text?: string
  children?: GeoLike[]
  [key: string]: unknown
}

export type StyleContext = {
  mode: PlanMode
  /** Tipo del nodo de Pascal que generó la geometría ('wall', 'door', 'zone', 'slab', 'item'…). */
  nodeType: string | undefined
  /** Puntos del PDF por unidad del plano (el metro): sirve para pasar puntos a metros. */
  ptPerUnit: number
  /** Color del ambiente (solo Color, nodo `zone`). */
  zoneColor?: string
  /** Color del material del piso (solo Color, nodo `slab`). */
  floorColor?: string
}

/** Ancho máximo de línea en Papel, en puntos: muros, aberturas (y escaleras, losas) y el resto. */
export const PAPER_WIDTH_PT = { wall: 0.7, opening: 0.35, light: 0.25 } as const

const OPENING_TYPES = new Set(['door', 'window', 'stair', 'stair-segment', 'slab', 'ceiling', 'column'])
const LEAF_KINDS = new Set(['path', 'polygon', 'polyline', 'rect', 'circle', 'line'])
const PAPER_INK = '#000000'
const WHITE = '#ffffff'
const ZONE_OPACITY = 0.35
const FLOOR_OPACITY = 0.55

const isNone = (color: string | undefined): boolean => !color || color === 'none' || color === 'transparent'

/** Pascal dibuja el texto del plano con Helvetica (Latin-1 y la puntuación de Windows-1252): lo que no tiene sale "?" en lugar de un carácter roto. */
export function safeText(value: string): string {
  return value.replace(/[^\u0020-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\u2122]/gu, '?')
}

/** Luminancia aproximada (0 a 1) de un color hexadecimal `#rgb` o `#rrggbb`; `null` si no lo es. */
function hexLuminance(color: string): number | null {
  const hex = color.trim().replace('#', '')
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) return null
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255)
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

export function isWhite(color: string | undefined): boolean {
  if (!color) return false
  const c = color.trim().toLowerCase()
  if (c === 'white') return true
  return (hexLuminance(c) ?? 0) >= 0.94
}

/** El filtro de colores de Papel: blanco (o casi blanco) queda blanco; todo lo demás, negro. */
export function paperColor(color: string): string {
  return isWhite(color) ? WHITE : PAPER_INK
}

/** Ancho de trazo en las unidades de la geometría: puntos si no escala con el plano, metros si escala. */
function strokeUnits(shape: GeoLike, widthPt: number, ptPerUnit: number): number {
  if (shape.vectorEffect === 'non-scaling-stroke' || ptPerUnit <= 0) return widthPt
  return widthPt / ptPerUnit
}

function paperWidthFor(nodeType: string | undefined): number {
  if (nodeType === 'wall') return PAPER_WIDTH_PT.wall
  return nodeType && OPENING_TYPES.has(nodeType) ? PAPER_WIDTH_PT.opening : PAPER_WIDTH_PT.light
}

function paperLeaf(shape: GeoLike, ctx: StyleContext): GeoLike {
  const { fillOpacity: _fillOpacity, strokeOpacity: _strokeOpacity, opacity: _opacity, strokeWidth: _strokeWidth, ...rest } = shape
  const wall = ctx.nodeType === 'wall'
  const fill = isNone(shape.fill) ? 'none' : isWhite(shape.fill) ? WHITE : wall ? PAPER_INK : 'none'
  const stroke = isNone(shape.stroke) ? 'none' : isWhite(shape.stroke) ? WHITE : ctx.nodeType === 'zone' ? 'none' : PAPER_INK
  const out: GeoLike = { ...rest, fill, stroke }
  if (stroke !== 'none') out.strokeWidth = strokeUnits(shape, paperWidthFor(ctx.nodeType), ctx.ptPerUnit)
  return out
}

function paperText(shape: GeoLike): GeoLike {
  const { stroke: _stroke, strokeWidth: _strokeWidth, paintOrder: _paintOrder, opacity: _opacity, ...rest } = shape
  return { ...rest, fill: PAPER_INK }
}

function colorLeaf(shape: GeoLike, ctx: StyleContext): GeoLike {
  if (ctx.nodeType === 'zone' && ctx.zoneColor && !isNone(shape.fill)) {
    return { ...shape, fill: ctx.zoneColor, fillOpacity: ZONE_OPACITY, stroke: 'none' }
  }
  if (ctx.nodeType === 'slab' && ctx.floorColor && !isNone(shape.fill)) {
    return { ...shape, fill: ctx.floorColor, fillOpacity: FLOOR_OPACITY }
  }
  return shape
}

function colorText(shape: GeoLike): GeoLike {
  return { ...shape, fill: BRAND.noche, stroke: WHITE, strokeWidth: (shape.fontSize ?? 0.2) * 0.12, paintOrder: 'stroke' }
}

/**
 * Aplica el modo Papel o Color a una geometría del plano. Devuelve una copia (nunca modifica la que recibe) o `null` si no
 * se dibuja (imágenes en Papel, grupos que quedan vacíos). Lo que no es forma ni texto (cotas, etiquetas de cota…) pasa
 * tal cual: sus colores fijos los convierte `withColorFilter` con `paperColor`.
 */
export function styleGeometry(geometry: GeoLike, ctx: StyleContext): GeoLike | null {
  if (geometry.kind === 'group') {
    const children = (geometry.children ?? [])
      .map((child) => styleGeometry(child, ctx))
      .filter((child): child is GeoLike => child !== null)
    return children.length === 0 ? null : { ...geometry, children }
  }
  if (geometry.kind === 'image') return ctx.mode === 'paper' ? null : geometry
  if (geometry.kind === 'text') {
    const clean = typeof geometry.text === 'string' ? { ...geometry, text: safeText(geometry.text) } : geometry
    return ctx.mode === 'paper' ? paperText(clean) : colorText(clean)
  }
  if (LEAF_KINDS.has(geometry.kind)) return ctx.mode === 'paper' ? paperLeaf(geometry, ctx) : colorLeaf(geometry, ctx)
  return geometry
}
