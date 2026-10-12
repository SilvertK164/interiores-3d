import * as Core from '@pascal-app/core'
import * as Pascal from '@pascal-app/editor'
import { Box3, Vector3 } from 'three'
import type { FrameMeasure } from './shell/frame-insets'
import type { FrameDeps } from './shell/bridge/frame'
import { fitCamera, fitPlan } from './shell/framing'

type PlanFit = (content: { minX: number; minY: number; maxX: number; maxY: number }, surface: { width: number; height: number }) => { centerX: number; centerY: number; width: number } | null

/** El campo de visión de la cámara 3D de Pascal (la pose que publica siempre dice 50). */
const FOV = 50

/** Esfera que envuelve la planta activa y las de abajo (las de arriba no se ven en Editar), en coordenadas del mundo. */
function activeBox(): { center: [number, number, number]; radius: number } | null {
  const nodes = Core.useScene.getState().nodes
  const active = nodes[Pascal.useViewer.getState().selection.levelId as Core.AnyNodeId] as (Core.AnyNode & { level?: number; parentId?: string | null }) | undefined
  if (active?.type !== 'level') return null
  const box = new Box3()
  for (const node of Object.values(nodes)) {
    if (node.type !== 'level' || node.parentId !== active.parentId || node.level > (active.level ?? 0)) continue
    const object = Core.sceneRegistry.nodes.get(node.id)
    if (object?.visible) box.union(new Box3().setFromObject(object))
  }
  if (box.isEmpty()) return null
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  return { center: [center.x, center.y, center.z], radius: Math.max(1, 0.5 * Math.hypot(size.x, size.y, size.z)) }
}

/**
 * Encuadre de cada vista. El plano 2D lo ajusta Pascal con su propio encuadre automático, que el parche de Madori
 * (`floorplan-panel.tsx`, `__madoriPlanFit`) deja en manos de `fitPlan` (la planta activa, no el terreno); la cámara 3D recibe una
 * pose con el mismo evento que usan los botones de vista de Pascal (`camera-controls:apply-pose`).
 */
export function frameDeps(): FrameDeps {
  return {
    frameViews: ({ plan, scene }: FrameMeasure) => {
      const global = globalThis as { __madoriPlanFit?: PlanFit }
      if (plan) {
        global.__madoriPlanFit = (content, surface) => fitPlan(content, surface, plan.insets)
        window.dispatchEvent(new Event('madori:plan-fit'))
      } else {
        global.__madoriPlanFit = undefined
      }
      const box = scene ? activeBox() : null
      if (scene && box) {
        const pose = fitCamera({ box, insets: scene.insets, canvas: scene.canvas, fov: FOV })
        Core.emitter.emit('camera-controls:apply-pose', { ...pose, fov: FOV, projection: Pascal.useViewer.getState().cameraMode } as never)
      }
    },
  }
}
