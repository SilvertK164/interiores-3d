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

/** La zona libre del lienzo (en píxeles) una vez descontados los paneles y el margen; nunca menor a 1 px. */
const freeZone = (size: { width: number; height: number }, insets: Insets, margin: number) => ({
  width: Math.max(1, size.width - insets.left - insets.right - 2 * margin),
  height: Math.max(1, size.height - insets.top - insets.bottom - 2 * margin),
  /** Cuánto se aparta el centro de la zona libre del centro del lienzo, en píxeles (derecha y abajo positivos). */
  offsetX: (insets.left - insets.right) / 2,
  offsetY: (insets.top - insets.bottom) / 2,
})

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
