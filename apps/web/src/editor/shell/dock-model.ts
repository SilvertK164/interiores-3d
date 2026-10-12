import {
  Blocks,
  BrickWall,
  Box,
  ChartNoAxesColumnIncreasing,
  Disc3,
  DoorOpen,
  Ellipsis,
  Grid3x3,
  Layers2,
  type LucideIcon,
  MousePointer2,
  PaintBucket,
  RectangleHorizontal,
  RectangleVertical,
  Spline,
  Ruler,
  Sofa,
  Square,
  SquareDashed,
  Triangle,
  Waypoints,
} from 'lucide-react'
import type { EditorMode, Phase } from './bridge/types'
import { DECISIONS, type Decisions } from './decisions'
import type { DockButton, MenuEntry } from './ui/Dock'

export type DockId = 'select' | 'structure' | 'openings' | 'furniture' | 'materials' | 'measure' | 'more'
export type StructureTool = 'wall' | 'zone' | 'slab' | 'ceiling' | 'stair' | 'column'
/** Entradas del menú Estructura: las herramientas más las variantes de escalera (que arman `stair` con su tipo). */
export type StructureEntryId = StructureTool | 'stair-curved' | 'stair-spiral'
export type OpeningTool = 'door' | 'window'
export type MeasureKind = 'distance' | 'angle' | 'area' | 'perimeter' | 'volume'

/** Lo que un botón o una entrada de menú pide armar en Pascal (el puente lo traduce a llamadas). */
export type Arming =
  | { kind: 'select' }
  | { kind: 'delete' }
  | { kind: 'furniture' }
  | { kind: 'paint' }
  | { kind: 'measure'; measure: MeasureKind }
  | { kind: 'tool'; tool: StructureTool | OpeningTool }

export const DOCK: readonly (DockButton & { id: DockId })[] = [
  { id: 'select', label: 'Seleccionar', icon: MousePointer2 },
  { id: 'structure', label: 'Estructura', icon: Blocks, menu: true },
  { id: 'openings', label: 'Aberturas', icon: DoorOpen, menu: true },
  { id: 'furniture', label: 'Muebles', icon: Sofa },
  { id: 'materials', label: 'Materiales', icon: PaintBucket },
  { id: 'measure', label: 'Medir', icon: Ruler, menu: true },
  { id: 'more', label: 'Más', icon: Ellipsis, menu: true, popup: 'dialog' },
]

type Entry<T extends string> = { id: T; label: string; icon: LucideIcon }

const STRUCTURE: readonly Entry<StructureEntryId>[] = [
  { id: 'wall', label: 'Muro', icon: BrickWall },
  { id: 'zone', label: 'Ambiente', icon: SquareDashed },
  { id: 'slab', label: 'Piso', icon: Grid3x3 },
  { id: 'ceiling', label: 'Cielorraso', icon: Layers2 },
  { id: 'stair', label: 'Escalera recta', icon: ChartNoAxesColumnIncreasing },
  { id: 'stair-curved', label: 'Escalera curva', icon: Spline },
  { id: 'stair-spiral', label: 'Escalera caracol', icon: Disc3 },
  { id: 'column', label: 'Columna', icon: RectangleVertical },
]

/** Menú Estructura. Si el spike dijo que la herramienta de ambientes no funciona, no se ofrece. */
export const structureEntries = (decisions: Pick<Decisions, 'zoneTool'> = DECISIONS): readonly Entry<StructureEntryId>[] =>
  STRUCTURE.filter((e) => e.id !== 'zone' || decisions.zoneTool)

export const OPENING_ENTRIES: readonly Entry<OpeningTool>[] = [
  { id: 'door', label: 'Puerta', icon: DoorOpen },
  { id: 'window', label: 'Ventana', icon: RectangleHorizontal },
]

export const MEASURE_ENTRIES: readonly Entry<MeasureKind>[] = [
  { id: 'distance', label: 'Distancia', icon: Ruler },
  { id: 'angle', label: 'Ángulo', icon: Triangle },
  { id: 'area', label: 'Área', icon: Square },
  { id: 'perimeter', label: 'Perímetro', icon: Waypoints },
  { id: 'volume', label: 'Volumen', icon: Box },
]

/** Entradas de menú listas para `ToolMenu`, con la activa marcada. */
export const asMenuEntries = (entries: readonly Entry<string>[], activeId: string | null): MenuEntry[] =>
  entries.map((e) => ({ ...e, active: e.id === activeId }))

/** Armado de los botones que no abren menú (`null` = abren un menú). */
export function armingForButton(id: DockId): Arming | null {
  if (id === 'select') return { kind: 'select' }
  if (id === 'furniture') return { kind: 'furniture' }
  if (id === 'materials') return { kind: 'paint' }
  return null
}

/** Qué panel va a la izquierda según el botón activo del dock. */
export function leftPanelFor(id: DockId | null): 'levels' | 'furniture' | 'materials' {
  if (id === 'furniture' || id === 'materials') return id
  return 'levels'
}

/** La tabla 4.3 del spec: cómo debe quedar Pascal (`phase` ausente = no cambia). Las pruebas en navegador la comparan con el estado real. */
export function expectedState(arming: Arming): { phase?: Phase; mode: EditorMode; tool: string | null } {
  switch (arming.kind) {
    case 'select':
      return { mode: 'select', tool: null }
    case 'delete':
      return { mode: 'delete', tool: null }
    case 'furniture':
      return { phase: 'furnish', mode: 'build', tool: 'item' }
    case 'paint':
      return { phase: 'structure', mode: 'material-paint', tool: null }
    case 'measure':
      return { phase: 'structure', mode: 'build', tool: 'measurement' }
    case 'tool':
      return { phase: 'structure', mode: 'build', tool: arming.tool }
  }
}

const STRUCTURE_TOOLS = new Set<string>(STRUCTURE.map((e) => e.id))
const OPENING_TOOLS = new Set<string>(OPENING_ENTRIES.map((e) => e.id))
const FURNITURE_TOOLS = new Set(['item', 'cabinet', 'shelf'])

/** Qué botón del dock marcar según el estado REAL de Pascal (que restaura herramienta y fase al abrir un proyecto). */
export function activeDockId(state: { mode: EditorMode; tool: string | null }): DockId | null {
  if (state.mode === 'material-paint') return 'materials'
  if (state.mode === 'delete') return 'more'
  if (state.mode === 'select' || state.mode === 'edit') return 'select'
  if (state.mode !== 'build' || !state.tool) return null
  if (STRUCTURE_TOOLS.has(state.tool)) return 'structure'
  if (OPENING_TOOLS.has(state.tool)) return 'openings'
  if (state.tool === 'measurement') return 'measure'
  if (FURNITURE_TOOLS.has(state.tool)) return 'furniture'
  return null
}
