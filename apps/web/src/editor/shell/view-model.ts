import { Footprints, Maximize, RotateCcw, RotateCw } from 'lucide-react'
import type { ViewOptions } from './bridge/view'
import { DECISIONS, type Decisions } from './decisions'
import type { ChipGroup, ViewAction } from './ui/ViewControls'

type ViewDecisions = Pick<Decisions, 'cameraControl' | 'styleControl' | 'walkthrough'>

const WALL_CHIPS = [
  { value: 'up', label: 'Completos' },
  { value: 'cutaway', label: 'Cortados' },
  { value: 'down', label: 'Bajos' },
] as const
const LEVEL_CHIPS = [
  { value: 'stacked', label: 'Juntos' },
  { value: 'exploded', label: 'Separados' },
  { value: 'solo', label: 'Uno solo' },
] as const
const CAMERA_CHIPS = [
  { value: 'perspective', label: 'Perspectiva' },
  { value: 'orthographic', label: 'Isométrica' },
] as const
const STYLE_CHIPS = [
  { value: 'solid', label: 'Sólido' },
  { value: 'rendered', label: 'Realista' },
] as const

/** Los grupos del panel Vista 3D. Cámara y Estilo solo si el spike de la Tarea 0b los confirmó (D7); si no, se ocultan. */
export function viewGroups(options: ViewOptions, decisions: ViewDecisions = DECISIONS): ChipGroup[] {
  return [
    { id: 'walls', title: 'Muros', chips: WALL_CHIPS, active: options.walls },
    { id: 'levels', title: 'Niveles', chips: LEVEL_CHIPS, active: options.levels },
    ...(decisions.cameraControl ? [{ id: 'camera', title: 'Cámara', chips: CAMERA_CHIPS, active: options.camera }] : []),
    ...(decisions.styleControl ? [{ id: 'shading', title: 'Estilo', chips: STYLE_CHIPS, active: options.shading }] : []),
  ]
}

/** Las acciones de la barra de cámara. Recorrer solo si el spike confirmó el puntero bloqueado (D7). */
export function viewActions(decisions: ViewDecisions = DECISIONS): ViewAction[] {
  return [
    { id: 'orbit-left', label: 'Girar izq.', icon: RotateCcw },
    { id: 'orbit-right', label: 'Girar der.', icon: RotateCw },
    { id: 'top', label: 'Vista superior', icon: Maximize },
    ...(decisions.walkthrough ? [{ id: 'walk', label: 'Recorrer', icon: Footprints }] : []),
  ]
}
