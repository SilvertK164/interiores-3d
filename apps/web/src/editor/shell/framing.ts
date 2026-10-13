/**
 * Encuadre de cada vista (plano 2D y cámara 3D) a la planta activa descontando lo que tapan los paneles flotantes del shell.
 * Funciones puras: las medidas de la pantalla las toma `frame-insets.ts` y Pascal las recibe por el puente.
 */
export type Rect = { x: number; y: number; width: number; height: number }
export type Insets = { left: number; right: number; top: number; bottom: number }
export type Panel = { side: keyof Insets; rect: Rect }

export const NO_INSETS: Insets = { left: 0, right: 0, top: 0, bottom: 0 }

/** Cuánto de cada borde del lienzo (`pane`) tapa un panel flotante; un panel que no toca el lienzo no descuenta nada. */
export function insetsFrom(pane: Rect, panels: readonly Panel[]): Insets {
  const out: Insets = { ...NO_INSETS }
  for (const { side, rect } of panels) {
    const overlapX = Math.min(pane.x + pane.width, rect.x + rect.width) - Math.max(pane.x, rect.x)
    const overlapY = Math.min(pane.y + pane.height, rect.y + rect.height) - Math.max(pane.y, rect.y)
    if (overlapX <= 0 || overlapY <= 0) continue
    const covered =
      side === 'left' ? rect.x + rect.width - pane.x : side === 'right' ? pane.x + pane.width - rect.x : side === 'top' ? rect.y + rect.height - pane.y : pane.y + pane.height - rect.y
    out[side] = Math.max(out[side], Math.max(0, covered))
  }
  return out
}

/** Holgura junto a un panel flotante (ya hay un borde visible: no hace falta el margen completo). */
export const PANEL_GAP = 12

/**
 * La zona libre del lienzo (en píxeles): se descuentan los paneles, con una holgura corta junto a cada uno y el margen completo en
 * los bordes libres; nunca menor a 1 px. `offset*` es cuánto se aparta su centro del centro del lienzo (derecha y abajo positivos).
 */
const freeZone = (size: { width: number; height: number }, insets: Insets, margin: number) => {
  const edge = (inset: number) => (inset > 0 ? inset + PANEL_GAP : margin)
  const left = edge(insets.left)
  const right = edge(insets.right)
  const top = edge(insets.top)
  const bottom = edge(insets.bottom)
  return {
    width: Math.max(1, size.width - left - right),
    height: Math.max(1, size.height - top - bottom),
    offsetX: (left - right) / 2,
    offsetY: (top - bottom) / 2,
  }
}

/** Margen alrededor de la planta: el 8 % del lado menor del lienzo (en píxeles). */
export const frameMargin = (canvas: { width: number; height: number }) => Math.round(0.08 * Math.min(canvas.width, canvas.height))

export type PlanBounds = { minX: number; minY: number; maxX: number; maxY: number }
export type PlanView = { centerX: number; centerY: number; width: number }

/**
 * Plano 2D: ancho y centro del `viewBox` (en unidades del plano) para que `content` entre completo en la zona libre y quede
 * centrado en ella. `surface` es el tamaño del lienzo en píxeles.
 */
export function fitPlan(content: PlanBounds, surface: { width: number; height: number }, insets: Insets, margin = 24): PlanView {
  const zone = freeZone(surface, insets, margin)
  const w = Math.max(1e-6, content.maxX - content.minX)
  const h = Math.max(1e-6, content.maxY - content.minY)
  const unitsPerPixel = Math.max(w / zone.width, h / zone.height)
  return {
    width: unitsPerPixel * surface.width,
    centerX: (content.minX + content.maxX) / 2 - zone.offsetX * unitsPerPixel,
    centerY: (content.minY + content.maxY) / 2 - zone.offsetY * unitsPerPixel,
  }
}

export type CameraFit = { position: [number, number, number]; target: [number, number, number]; viewWidth: number }

/** La dirección desde el centro hacia la cámara: en diagonal (45°) y mirando desde 35° de altura, como la vista inicial de Pascal. */
const AZIMUTH = Math.PI / 4
const ELEVATION = (35 * Math.PI) / 180

/**
 * Cámara 3D: una esfera (`box`) que envuelve la planta activa y las de abajo, vista desde la diagonal, a la distancia justa para
 * que quepa en la zona libre; la mira se corre para que la esfera quede centrada en esa zona y no bajo los paneles.
 */
export function fitCamera({
  box,
  insets,
  canvas,
  fov,
  margin = 24,
}: {
  box: { center: [number, number, number]; radius: number }
  insets: Insets
  canvas: { width: number; height: number }
  fov: number
  margin?: number
}): CameraFit {
  const zone = freeZone(canvas, insets, margin)
  const tanHalf = Math.tan((fov * Math.PI) / 360)
  const t = (tanHalf * Math.min(zone.width, zone.height)) / canvas.height
  const distance = (box.radius * Math.sqrt(1 + t * t)) / t
  const dir: [number, number, number] = [Math.cos(ELEVATION) * Math.sin(AZIMUTH), Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.cos(AZIMUTH)]
  // Derecha y arriba de la pantalla (la cámara mira hacia -dir).
  const right: [number, number, number] = [dir[2], 0, -dir[0]]
  const up: [number, number, number] = [-dir[0] * dir[1], dir[0] * dir[0] + dir[2] * dir[2], -dir[2] * dir[1]]
  const upLength = Math.hypot(...up)
  const worldPerPixel = (2 * distance * tanHalf) / canvas.height
  const target = box.center.map((c, i) => c - (right[i] ?? 0) * zone.offsetX * worldPerPixel + ((up[i] ?? 0) / upLength) * zone.offsetY * worldPerPixel) as [number, number, number]
  const position = target.map((c, i) => c + (dir[i] ?? 0) * distance) as [number, number, number]
  const unitsPerPixel = (2 * box.radius) / Math.min(zone.width, zone.height)
  return { position, target, viewWidth: unitsPerPixel * canvas.width }
}
