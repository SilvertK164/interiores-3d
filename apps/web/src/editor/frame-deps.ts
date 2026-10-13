import * as Core from '@pascal-app/core'
import * as Pascal from '@pascal-app/editor'
import { Box3, Vector3 } from 'three'
import type { FrameMeasure } from './shell/frame-insets'
import type { FrameDeps, ScenePose } from './shell/bridge/frame'
import { fitCamera, fitPlan, frameMargin } from './shell/framing'

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
 * Lo que mueve la cámara 3D por su cuenta, sin pasar por el encuadre: los gestos de la persona (`interaction-start`: arrastrar, rueda,
 * teclas) y los botones de vista de Pascal (girar, vista superior, enfocar un nodo, encuadrar la escena). `apply-pose`, el evento del
 * encuadre, no está: es lo que se emite para mover la cámara, no un movimiento de la persona.
 */
const CAMERA_MOVES = [
  'camera-controls:interaction-start',
  'camera-controls:orbit-cw',
  'camera-controls:orbit-ccw',
  'camera-controls:top-view',
  'camera-controls:fit-scene',
  'camera-controls:view',
  'camera-controls:focus',
] as const

/** La pose de la foto, con el mismo evento del encuadre (`apply-pose`), siempre en perspectiva (una foto no es isométrica) y con su propio `fov`. */
const photoPose = ({ position, target, fov }: ScenePose) => ({ position, target, fov: fov ?? FOV, projection: 'perspective' as const })

/**
 * Encuadre de cada vista. El plano 2D lo ajusta Pascal con su propio encuadre automático, que el parche de Madori
 * (`floorplan-panel.tsx`, `__madoriPlanFit`) deja en manos de `fitPlan` (la planta activa, no el terreno); la cámara 3D recibe una
 * pose con el mismo evento que usan los botones de vista de Pascal (`camera-controls:apply-pose`): la diagonal que ajusta `fitCamera`
 * o, si el puente retiene una (la de «Escena desde una foto»), esa.
 */
export function frameDeps(): FrameDeps {
  return {
    watchCameraMoves: (listener) => {
      for (const name of CAMERA_MOVES) Core.emitter.on(name, listener)
      return () => {
        for (const name of CAMERA_MOVES) Core.emitter.off(name, listener)
      }
    },
    frameViews: ({ plan, scene }: FrameMeasure, scenePose?: ScenePose): boolean => {
      const global = globalThis as { __madoriPlanFit?: PlanFit }
      if (plan) {
        global.__madoriPlanFit = (content, surface) => fitPlan(content, surface, plan.insets, frameMargin(surface))
        window.dispatchEvent(new Event('madori:plan-fit'))
      } else {
        global.__madoriPlanFit = undefined
      }
      const box = scene ? activeBox() : null
      if (scene && box) {
        if (scenePose) {
          Core.emitter.emit('camera-controls:apply-pose', photoPose(scenePose))
        } else {
          const pose = fitCamera({ box, insets: scene.insets, canvas: scene.canvas, fov: FOV, margin: frameMargin(scene.canvas) })
          Core.emitter.emit('camera-controls:apply-pose', { ...pose, fov: FOV, projection: Pascal.useViewer.getState().cameraMode } as never)
        }
      }
      // Sin lienzo o sin geometría todavía: la escena sigue cargando y el shell reintenta.
      return (plan !== null || scene !== null) && (scene === null || box !== null)
    },
  }
}
