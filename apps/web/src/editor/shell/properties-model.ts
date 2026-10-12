import type { SceneNodeLike } from './bridge/types'
import type { FieldView } from './ui/PropertiesCard'

/** Un nodo de Pascal con los campos que el panel lee (cada tipo trae los suyos: `@pascal-app/core/dist/schema/nodes`). */
export type PropNode = SceneNodeLike & Record<string, unknown>

/** El elemento elegido y lo que el panel necesita de su entorno. */
export type PropTarget = {
  node: PropNode
  /** Largo, en metros, del muro que aloja a una puerta o ventana (`null` si no tiene muro o no se encuentra). */
  hostLength: number | null
  /** Cuántos elementos cuelgan de este (aberturas de un muro, muebles sobre un estante): se borran con él. */
  descendants: number
}

export type Patch = Record<string, unknown>

/** Cómo se comporta el panel con un tipo de nodo: sus campos, qué cambia al editar uno, su título y su copia. */
type Builder = {
  fields(target: PropTarget): FieldView[]
  /** El cambio de un campo (`null` = no se entiende o no cambia nada). Fuera del rango se ajusta al límite. */
  patch(target: PropTarget, fieldId: string, raw: string): Patch | null
  title?(target: PropTarget): string
  subtitle?(target: PropTarget): string
  /** Qué cambiar en la copia para que no quede encima del original (`null` = no hay lugar o no se duplica). */
  duplicate?(target: PropTarget): Patch | null
}

/** Rangos en metros: fuera de ellos el valor se ajusta al límite. Los mínimos de Pascal son 0,5 (puerta), 0,3 (ventana) y 0,05 (grosor). */
export const LIMITS = {
  wallLength: [0.1, 100],
  wallHeight: [0.1, 10],
  wallThickness: [0.05, 1],
  doorWidth: [0.5, 3],
  doorHeight: [1, 3.5],
  windowWidth: [0.3, 6],
  windowHeight: [0.3, 4],
  windowSill: [0, 2.5],
  itemSize: [0.05, 10],
  zoneHeight: [1.8, 10],
} as const satisfies Record<string, readonly [number, number]>

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const roundMm = (value: number) => Math.round(value * 1000) / 1000
const differs = (a: number, b: number) => Math.abs(a - b) > 0.0005

/** "1,25", "1.25", "1,25 m" o "125 cm" → metros. Sin unidad se entiende metros. `null` si no es un número. */
export function parseMeters(raw: string): number | null {
  const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*(m|cm)?\s*$/i.exec(raw)
  if (!match) return null
  const value = Number((match[1] ?? '').replace(',', '.'))
  if (!Number.isFinite(value)) return null
  return match[2]?.toLowerCase() === 'cm' ? value / 100 : value
}

/** "90", "90°" o "90 grados" → grados normalizados a [0, 360). `null` si no es un número. */
export function parseDegrees(raw: string): number | null {
  const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*(°|grados?)?\s*$/i.exec(raw)
  if (!match) return null
  const value = Number((match[1] ?? '').replace(',', '.'))
  return Number.isFinite(value) ? ((value % 360) + 360) % 360 : null
}

/** Un campo de metros: lee, ajusta al rango y devuelve el valor nuevo solo si es distinto del actual. */
export function metersPatch(raw: string, range: readonly [number, number], current: number): number | null {
  const parsed = parseMeters(raw)
  if (parsed === null) return null
  const next = roundMm(clamp(parsed, range[0], range[1]))
  return differs(next, current) ? next : null
}

const TYPES: Readonly<Record<string, { label: string; article: 'Este' | 'Esta' }>> = {
  wall: { label: 'Muro', article: 'Este' },
  door: { label: 'Puerta', article: 'Esta' },
  window: { label: 'Ventana', article: 'Esta' },
  item: { label: 'Mueble', article: 'Este' },
  zone: { label: 'Ambiente', article: 'Este' },
  slab: { label: 'Piso', article: 'Este' },
  ceiling: { label: 'Cielorraso', article: 'Este' },
  stair: { label: 'Escalera', article: 'Esta' },
  column: { label: 'Columna', article: 'Esta' },
  shelf: { label: 'Estante', article: 'Este' },
  cabinet: { label: 'Gabinete', article: 'Este' },
  fence: { label: 'Cerco', article: 'Este' },
  roof: { label: 'Techo', article: 'Este' },
}
export const typeLabel = (type: string) => TYPES[type]?.label ?? 'Elemento'

// @@builders

const BUILDERS: Readonly<Record<string, Builder>> = {
  // @@types
}

const builderOf = (target: PropTarget) => BUILDERS[target.node.type]

/** Campos del panel; los tipos sin constructor (piso, escalera…) no tienen: reciben el panel mínimo (D5). */
export const fieldsFor = (target: PropTarget): FieldView[] => builderOf(target)?.fields(target) ?? []

/** El cambio que produce editar un campo, o `null` si no se entiende o no cambia nada. */
export const patchFor = (target: PropTarget, fieldId: string, raw: string): Patch | null =>
  builderOf(target)?.patch(target, fieldId, raw) ?? null

/** Título del panel: el nombre del ambiente o del mueble; si no, el tipo ("Muro"). */
export const titleFor = (target: PropTarget): string => builderOf(target)?.title?.(target) ?? typeLabel(target.node.type)

export const subtitleFor = (target: PropTarget): string | undefined => builderOf(target)?.subtitle?.(target)

/** Qué cambiar en la copia para que no quede encima del original (`null` = este tipo no se duplica o no hay lugar). */
export const duplicatePatch = (target: PropTarget): Patch | null => builderOf(target)?.duplicate?.(target) ?? null

export const canDuplicate = (target: PropTarget): boolean => duplicatePatch(target) !== null

/** El aviso de Borrar cuando el elemento tiene cosas colgando (se borran con él); `null` si no tiene y se borra sin preguntar. */
export function deleteWarning({ node, descendants }: PropTarget): string | null {
  if (descendants === 0) return null
  const many = descendants > 1
  const article = TYPES[node.type]?.article ?? 'Este'
  return `${article} ${typeLabel(node.type).toLowerCase()} tiene ${descendants} ${many ? 'elementos' : 'elemento'} que también ${many ? 'se borrarán' : 'se borrará'}.`
}
