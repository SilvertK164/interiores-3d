import { zoneDisplayName } from '@/lib/editor-names'
import { formatArea, formatMeters } from '@/lib/format'
import { shoelaceArea } from './bridge/levels'
import type { SceneNodeLike } from './bridge/types'
import { itemBuilder } from './properties-item'
import { doorBuilder, windowBuilder } from './properties-openings'
import { PARAMETRIC_BUILDERS } from './properties-parametric'
import {
  LIMITS,
  metersPatch,
  num,
  pair,
  parseDegrees,
  parseMeters,
  roundMm,
  SHIFT,
} from './properties-units'
import type { FieldView } from './ui/PropertiesCard'

// Las mismas exportaciones públicas de siempre (los rangos y la lectura de medidas viven en properties-units.ts).
export { LIMITS, metersPatch, parseDegrees, parseMeters }

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
export type Builder = {
  fields(target: PropTarget): FieldView[]
  /** El cambio de un campo (`null` = no se entiende o no cambia nada). Fuera del rango se ajusta al límite. */
  patch(target: PropTarget, fieldId: string, raw: string): Patch | null
  title?(target: PropTarget): string
  subtitle?(target: PropTarget): string
  /** Qué cambiar en la copia para que no quede encima del original (`null` = no hay lugar o no se duplica). */
  duplicate?(target: PropTarget): Patch | null
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
  'stair-segment': { label: 'Tramo de escalera', article: 'Este' },
  column: { label: 'Columna', article: 'Esta' },
  shelf: { label: 'Estante', article: 'Este' },
  cabinet: { label: 'Gabinete', article: 'Este' },
  'cabinet-module': { label: 'Módulo de gabinete', article: 'Este' },
  fence: { label: 'Cerco', article: 'Este' },
  roof: { label: 'Techo', article: 'Este' },
}
export const typeLabel = (type: string) => TYPES[type]?.label ?? 'Elemento'

/** Lo que Pascal asume cuando un muro no trae el campo (`DEFAULT_WALL_HEIGHT` y `DEFAULT_WALL_THICKNESS` de `@pascal-app/core`). */
export const WALL_DEFAULTS = { height: 2.5, thickness: 0.1 } as const
const ZONE_HEIGHT_DEFAULT = 2.7

const wallVector = (node: PropNode) => {
  const [sx, sz] = pair(node.start)
  const [ex, ez] = pair(node.end)
  return { sx, sz, ex, ez, length: Math.hypot(ex - sx, ez - sz) }
}

/** Largo en metros de un muro (la distancia entre sus extremos); también sirve para ubicar sus puertas y ventanas. */
export const wallLength = (node: PropNode) => wallVector(node).length

const wall: Builder = {
  fields: ({ node }) => [
    { kind: 'number', id: 'length', label: 'Largo', value: formatMeters(wallVector(node).length) },
    {
      kind: 'number',
      id: 'height',
      label: 'Alto',
      value: formatMeters(num(node.height, WALL_DEFAULTS.height)),
    },
    {
      kind: 'number',
      id: 'thickness',
      label: 'Grosor',
      value: formatMeters(num(node.thickness, WALL_DEFAULTS.thickness)),
    },
  ],
  patch: ({ node }, fieldId, raw) => {
    if (fieldId === 'height') {
      const value = metersPatch(raw, LIMITS.wallHeight, num(node.height, WALL_DEFAULTS.height))
      return value === null ? null : { height: value }
    }
    if (fieldId === 'thickness') {
      const value = metersPatch(
        raw,
        LIMITS.wallThickness,
        num(node.thickness, WALL_DEFAULTS.thickness),
      )
      return value === null ? null : { thickness: value }
    }
    if (fieldId === 'length') {
      const { sx, sz, ex, ez, length } = wallVector(node)
      const value = metersPatch(raw, LIMITS.wallLength, length)
      if (value === null || length === 0) return null
      const ratio = value / length
      return { end: [roundMm(sx + (ex - sx) * ratio), roundMm(sz + (ez - sz) * ratio)] }
    }
    return null
  },
  subtitle: ({ node }) => `Largo ${formatMeters(wallVector(node).length)}`,
  duplicate: ({ node }) => {
    const { sx, sz, ex, ez } = wallVector(node)
    return { start: [sx + SHIFT, sz + SHIFT], end: [ex + SHIFT, ez + SHIFT] }
  },
}

/** Los colores con que se pinta un ambiente en el plano (el primero es el que Pascal usa por omisión). */
export const ZONE_COLORS = [
  { value: '#3b82f6', label: 'Azul', color: '#3b82f6' },
  { value: '#22c55e', label: 'Verde', color: '#22c55e' },
  { value: '#f59e0b', label: 'Ámbar', color: '#f59e0b' },
  { value: '#ec4899', label: 'Rosa', color: '#ec4899' },
  { value: '#8b5cf6', label: 'Violeta', color: '#8b5cf6' },
  { value: '#94a3b8', label: 'Gris', color: '#94a3b8' },
] as const

const zonePolygon = (node: PropNode): readonly (readonly [number, number])[] =>
  Array.isArray(node.polygon) ? node.polygon.map(pair) : []
const zoneName = (node: PropNode) => (typeof node.name === 'string' ? node.name : '')

const zone: Builder = {
  fields: ({ node }) => [
    { kind: 'text', id: 'name', label: 'Nombre', value: zoneDisplayName(zoneName(node)) },
    {
      kind: 'number',
      id: 'ceilingHeight',
      label: 'Altura',
      value: formatMeters(num(node.ceilingHeight, ZONE_HEIGHT_DEFAULT)),
    },
    {
      kind: 'swatch',
      id: 'color',
      label: 'Color',
      value: typeof node.color === 'string' ? node.color : '',
      options: ZONE_COLORS,
    },
    {
      kind: 'readonly',
      id: 'area',
      label: 'Superficie',
      value: formatArea(shoelaceArea(zonePolygon(node))),
    },
  ],
  patch: ({ node }, fieldId, raw) => {
    if (fieldId === 'name') {
      const name = raw.trim()
      return name === '' || name === zoneDisplayName(zoneName(node)) ? null : { name }
    }
    if (fieldId === 'ceilingHeight') {
      const value = metersPatch(
        raw,
        LIMITS.zoneHeight,
        num(node.ceilingHeight, ZONE_HEIGHT_DEFAULT),
      )
      return value === null ? null : { ceilingHeight: value }
    }
    if (fieldId === 'color')
      return raw === node.color || !/^#[0-9a-f]{6}$/i.test(raw) ? null : { color: raw }
    return null
  },
  title: ({ node }) => zoneDisplayName(zoneName(node)),
  subtitle: ({ node }) => formatArea(shoelaceArea(zonePolygon(node))),
  duplicate: ({ node }) => ({
    polygon: zonePolygon(node).map(([x, z]) => [x + SHIFT, z + SHIFT]),
    name: `${zoneDisplayName(zoneName(node))} (copia)`,
  }),
}

// @@builders

const BUILDERS: Readonly<Record<string, Builder>> = {
  wall,
  zone,
  door: doorBuilder,
  window: windowBuilder,
  item: itemBuilder,
  // @@types
}

const builderOf = (target: PropTarget) => BUILDERS[target.node.type] ?? PARAMETRIC_BUILDERS[target.node.type]

/** Campos del panel; los tipos sin constructor (piso, escalera…) no tienen: reciben el panel mínimo (D5). */
export const fieldsFor = (target: PropTarget): FieldView[] =>
  builderOf(target)?.fields(target) ?? []

/** El cambio que produce editar un campo, o `null` si no se entiende o no cambia nada. */
export const patchFor = (target: PropTarget, fieldId: string, raw: string): Patch | null =>
  builderOf(target)?.patch(target, fieldId, raw) ?? null

/** Título del panel: el nombre del ambiente o del mueble; si no, el tipo ("Muro"). */
export const titleFor = (target: PropTarget): string =>
  builderOf(target)?.title?.(target) ?? typeLabel(target.node.type)

export const subtitleFor = (target: PropTarget): string | undefined =>
  builderOf(target)?.subtitle?.(target)

/** Qué cambiar en la copia para que no quede encima del original (`null` = este tipo no se duplica o no hay lugar). */
export const duplicatePatch = (target: PropTarget): Patch | null =>
  builderOf(target)?.duplicate?.(target) ?? null

export const canDuplicate = (target: PropTarget): boolean => duplicatePatch(target) !== null

/** El aviso de Borrar cuando el elemento tiene cosas colgando (se borran con él); `null` si no tiene y se borra sin preguntar. */
export function deleteWarning({ node, descendants }: PropTarget): string | null {
  if (descendants === 0) return null
  const many = descendants > 1
  const article = TYPES[node.type]?.article ?? 'Este'
  return `${article} ${typeLabel(node.type).toLowerCase()} tiene ${descendants} ${many ? 'elementos' : 'elemento'} que también ${many ? 'se borrarán' : 'se borrará'}.`
}
