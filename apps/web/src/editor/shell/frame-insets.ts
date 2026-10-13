import { type Insets, type Panel, type Rect, insetsFrom } from './framing'

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
}

/** Los paneles flotantes del shell que hay ahora en pantalla (cada uno lleva `data-frame-panel="left|right|top|bottom"`). */
function panelsOnScreen(doc: Document): Panel[] {
  return [...doc.querySelectorAll<HTMLElement>('[data-frame-panel]')]
    .map((el) => ({ side: el.dataset.framePanel as Panel['side'], rect: rectOf(el) }))
    .filter((p) => p.rect.width > 0 && p.rect.height > 0)
}

export type FrameMeasure = {
  /** Plano 2D abierto: su lienzo y lo que le tapan los paneles. */
  plan: { canvas: { width: number; height: number }; insets: Insets } | null
  /** Vista 3D abierta: ídem. */
  scene: { canvas: { width: number; height: number }; insets: Insets } | null
}

/** Mide, en la pantalla real, el lienzo de cada vista abierta y los márgenes que ocupan los paneles del shell. */
export function measureFrame(doc: Document = document): FrameMeasure {
  const panels = panelsOnScreen(doc)
  const svg = doc.querySelector<SVGGElement>('[data-floorplan-scene]')?.ownerSVGElement
  const canvas3d = doc.querySelector<HTMLElement>('[data-pascal-viewer-3d]')
  const view = (el: Element | null | undefined) => {
    if (!el) return null
    const pane = rectOf(el)
    if (pane.width < 50 || pane.height < 50) return null
    return { canvas: { width: pane.width, height: pane.height }, insets: insetsFrom(pane, panels) }
  }
  return { plan: view(svg), scene: view(canvas3d) }
}
