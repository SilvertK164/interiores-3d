import {
  Archive,
  ChartNoAxesColumnIncreasing,
  CookingPot,
  Disc3,
  Droplets,
  Flame,
  LayoutGrid,
  Library,
  type LucideIcon,
  Microwave,
  PanelTop,
  Refrigerator,
  Rows3,
  Spline,
  WashingMachine,
  Zap,
} from 'lucide-react'

/**
 * Elementos paramétricos que se colocan con un preset ("A medida"). Los ids salen de Pascal 1.0.3:
 * estilos de `ShelfNode.style` (`core/dist/schema/nodes/shelf.js`), presets de módulo de `nodes/dist/cabinet/presets.js`
 * y `StairType` (`core/dist/schema/nodes/stair.js`).
 */
export type ShelfStyle = 'cubby' | 'bookshelf' | 'open-rack' | 'wall-shelf'
export type CabinetPresetId =
  | 'base-door'
  | 'drawer-base'
  | 'sink-base'
  | 'dishwasher'
  | 'cooktop-gas'
  | 'cooktop-induction'
  | 'tall-pantry'
  | 'oven-tower'
  | 'fridge-single'
export type StairKind = 'straight' | 'curved' | 'spiral'

export type PresetCard<Id extends string> = { id: Id; label: string; detail: string; icon: LucideIcon }

export const SHELF_CARDS: readonly PresetCard<ShelfStyle>[] = [
  { id: 'cubby', label: 'Cubículos', detail: 'Celdas cerradas', icon: LayoutGrid },
  { id: 'bookshelf', label: 'Biblioteca', detail: 'Con laterales y fondo', icon: Library },
  { id: 'open-rack', label: 'Góndola', detail: 'Estructura abierta', icon: Rows3 },
  { id: 'wall-shelf', label: 'Repisa de pared', detail: 'Una tabla con soportes', icon: PanelTop },
]

export const CABINET_CARDS: readonly PresetCard<CabinetPresetId>[] = [
  { id: 'base-door', label: 'Bajo con puertas y cajones', detail: '0,50 m', icon: Archive },
  { id: 'drawer-base', label: 'Cajonera', detail: '0,50 m', icon: Archive },
  { id: 'sink-base', label: 'Bajo fregadero', detail: '0,80 m', icon: Droplets },
  { id: 'dishwasher', label: 'Lavavajillas', detail: '0,60 m', icon: WashingMachine },
  { id: 'cooktop-gas', label: 'Bajo anafe a gas', detail: '0,75 m', icon: Flame },
  { id: 'cooktop-induction', label: 'Bajo anafe de inducción', detail: '0,75 m', icon: Zap },
  { id: 'tall-pantry', label: 'Alacena alta', detail: '2,07 m de alto', icon: CookingPot },
  { id: 'oven-tower', label: 'Torre de horno', detail: '2,07 m de alto', icon: Microwave },
  { id: 'fridge-single', label: 'Heladera', detail: '1,78 m de alto', icon: Refrigerator },
]

export const STAIR_CARDS: readonly PresetCard<StairKind>[] = [
  { id: 'straight', label: 'Escalera recta', detail: 'Por tramos', icon: ChartNoAxesColumnIncreasing },
  { id: 'curved', label: 'Escalera curva', detail: 'En arco', icon: Spline },
  { id: 'spiral', label: 'Escalera caracol', detail: 'En espiral', icon: Disc3 },
]

/** Lo que se cambia en el estante recién colocado (la herramienta de Pascal siempre crea un cubículo de 3 por 2). */
export function shelfPatch(style: ShelfStyle): Record<string, unknown> {
  if (style === 'cubby') return {}
  if (style === 'bookshelf') return { style, rows: 4, columns: 2, height: 1.8, withBack: true, withSides: true, withBottom: true }
  if (style === 'open-rack') return { style, rows: 4, columns: 1, height: 1.8, withBack: false }
  return { style, rows: 1, columns: 1, width: 1.2, depth: 0.25, height: 1.2, withBack: false, withBottom: false, bracketStyle: 'minimal' }
}

export type Compartment = Record<string, unknown> & { id: string; type: string }
const cid = () => `cc_${Math.random().toString(36).slice(2, 10)}`
const part = (type: string, extra: Record<string, unknown> = {}): Compartment => ({ id: cid(), type, ...extra })
const cooktop = (type: 'cooktop-gas' | 'cooktop-induction') => [
  part('drawer', { drawerCount: 2 }),
  part(type, {
    height: 0.08,
    cooktopLayout: type === 'cooktop-gas' ? 'gas-5burner-wok' : 'induction-4zone',
    cooktopBurnersOn: false,
    cooktopActiveBurners: [],
    cooktopKnobProgress: [],
    cooktopShowGrate: true,
  }),
]

const BASE = { cabinetType: 'base', handleStyle: 'bar', frontOverlay: 'full' } as const
const TALL = { cabinetType: 'tall', handleStyle: 'bar', frontOverlay: 'full', carcassHeight: 2.07 } as const

/**
 * Parche de módulo de cada preset (copia de `nodes/dist/cabinet/presets.js`, que no se exporta) para
 * `useEditor.toolDefaults.cabinet`, que la herramienta de gabinetes mezcla en el módulo. No lleva zócalo ni encimera: esos
 * campos también llegarían al gabinete (la hilera) y lo dejarían sin ellos.
 */
export function cabinetDefaults(id: CabinetPresetId): Record<string, unknown> {
  switch (id) {
    case 'base-door':
      return { ...BASE, width: 0.5, handlePosition: 'auto', stack: [part('drawer', { height: 0.44, drawerCount: 3 }), part('door', { doorType: 'double', shelfCount: 2 })] }
    case 'drawer-base':
      return { ...BASE, width: 0.5, handlePosition: 'top', stack: [part('drawer', { drawerCount: 3 })] }
    case 'sink-base':
      return { ...BASE, width: 0.8, handlePosition: 'auto', stack: [part('door', { doorType: 'double' }), part('sink', { sinkLayout: 'single' })] }
    case 'dishwasher':
      return { ...BASE, width: 0.6, handlePosition: 'top', stack: [part('dishwasher', { height: 0.72 })] }
    case 'cooktop-gas':
      return { ...BASE, width: 0.75, handlePosition: 'top', stack: cooktop('cooktop-gas') }
    case 'cooktop-induction':
      return { ...BASE, width: 0.75, handlePosition: 'top', stack: cooktop('cooktop-induction') }
    case 'tall-pantry':
      return { ...TALL, width: 0.5, handlePosition: 'auto', stack: [part('door', { doorType: 'double', shelfCount: 4 })] }
    case 'oven-tower':
      return {
        ...TALL,
        width: 0.61,
        handlePosition: 'top',
        stack: [part('drawer', { height: 0.42, drawerCount: 2 }), part('oven', { height: 0.595 }), part('microwave', { height: 0.39 }), part('door', { doorType: 'double', shelfCount: 2 })],
      }
    case 'fridge-single':
      return { ...TALL, width: 0.76, carcassHeight: 1.78, handlePosition: 'center', stack: [part('fridge-single', { height: 1.78 })] }
  }
}

/** Qué se coloca con cada tarjeta: el puente lo traduce a la herramienta y su preset. */
export type PresetArming =
  | { kind: 'shelf'; style: ShelfStyle }
  | { kind: 'cabinet'; preset: CabinetPresetId }
  | { kind: 'stair'; stairType: StairKind }
