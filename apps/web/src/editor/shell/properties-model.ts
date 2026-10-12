import { zoneDisplayName } from '@/lib/editor-names'
import { formatArea, formatMeters } from '@/lib/format'
import { shoelaceArea } from './bridge/levels'
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

/** Lo que Pascal asume cuando un muro no trae el campo (`DEFAULT_WALL_HEIGHT` y `DEFAULT_WALL_THICKNESS` de `@pascal-app/core`). */
export const WALL_DEFAULTS = { height: 2.5, thickness: 0.1 } as const
const ZONE_HEIGHT_DEFAULT = 2.7
/** Cuánto se corre una copia (en metros) para que no quede encima del original. */
const SHIFT = 0.5

const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
const pair = (value: unknown): readonly [number, number] => (Array.isArray(value) ? [num(value[0], 0), num(value[1], 0)] : [0, 0])

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
    { kind: 'number', id: 'height', label: 'Alto', value: formatMeters(num(node.height, WALL_DEFAULTS.height)) },
    { kind: 'number', id: 'thickness', label: 'Grosor', value: formatMeters(num(node.thickness, WALL_DEFAULTS.thickness)) },
  ],
  patch: ({ node }, fieldId, raw) => {
    if (fieldId === 'height') {
      const value = metersPatch(raw, LIMITS.wallHeight, num(node.height, WALL_DEFAULTS.height))
      return value === null ? null : { height: value }
    }
    if (fieldId === 'thickness') {
      const value = metersPatch(raw, LIMITS.wallThickness, num(node.thickness, WALL_DEFAULTS.thickness))
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
    { kind: 'number', id: 'ceilingHeight', label: 'Altura', value: formatMeters(num(node.ceilingHeight, ZONE_HEIGHT_DEFAULT)) },
    { kind: 'swatch', id: 'color', label: 'Color', value: typeof node.color === 'string' ? node.color : '', options: ZONE_COLORS },
    { kind: 'readonly', id: 'area', label: 'Superficie', value: formatArea(shoelaceArea(zonePolygon(node))) },
  ],
  patch: ({ node }, fieldId, raw) => {
    if (fieldId === 'name') {
      const name = raw.trim()
      return name === '' || name === zoneDisplayName(zoneName(node)) ? null : { name }
    }
    if (fieldId === 'ceilingHeight') {
      const value = metersPatch(raw, LIMITS.zoneHeight, num(node.ceilingHeight, ZONE_HEIGHT_DEFAULT))
      return value === null ? null : { ceilingHeight: value }
    }
    if (fieldId === 'color') return raw === node.color || !/^#[0-9a-f]{6}$/i.test(raw) ? null : { color: raw }
    return null
  },
  title: ({ node }) => zoneDisplayName(zoneName(node)),
  subtitle: ({ node }) => formatArea(shoelaceArea(zonePolygon(node))),
  duplicate: ({ node }) => ({
    polygon: zonePolygon(node).map(([x, z]) => [x + SHIFT, z + SHIFT]),
    name: `${zoneDisplayName(zoneName(node))} (copia)`,
  }),
}

const vec3 = (value: unknown): readonly [number, number, number] =>
  Array.isArray(value) ? [num(value[0], 0), num(value[1], 0), num(value[2], 0)] : [0, 0, 0]

/** Medidas de fábrica de Pascal cuando el nodo no trae el campo (`DoorNode` y `WindowNode` de `@pascal-app/core`). */
const DOOR_DEFAULTS = { width: 0.9, height: 2.1 } as const
const WINDOW_DEFAULTS = { width: 1.5, height: 1.5 } as const

const DOOR_TYPES: Readonly<Record<string, string>> = {
  hinged: 'Batiente',
  double: 'Doble',
  french: 'Francesa',
  folding: 'Plegable',
  pocket: 'Embutida',
  barn: 'De granero',
  sliding: 'Corrediza',
  'garage-sectional': 'De garaje seccional',
  'garage-rollup': 'De garaje enrollable',
  'garage-tiltup': 'De garaje basculante',
}
const DOOR_CHOICES = ['hinged', 'double', 'french'] as const
const WINDOW_TYPES: Readonly<Record<string, string>> = {
  fixed: 'Fija',
  sliding: 'Corrediza',
  casement: 'Batiente',
  awning: 'Proyectante',
  hopper: 'Banderola',
  'single-hung': 'Guillotina simple',
  'double-hung': 'Guillotina doble',
  bay: 'En saliente',
  bow: 'Curva',
  louvered: 'Con celosías',
}
const WINDOW_CHOICES = ['fixed', 'sliding', 'casement', 'awning', 'single-hung', 'double-hung'] as const
const SHAPES: Readonly<Record<string, string>> = { rectangle: 'Rectangular', rounded: 'Redondeado', arch: 'Arco' }
const SHAPE_OPTIONS = Object.entries(SHAPES).map(([value, label]) => ({ value, label }))

/** Las opciones que se pueden elegir; si el nodo trae otra (una puerta plegable), se muestra deshabilitada para decir la verdad. */
function typeOptions(labels: Readonly<Record<string, string>>, choices: readonly string[], current: string) {
  const base = choices.map((value) => ({ value, label: labels[value] ?? value }))
  return choices.includes(current) ? base : [...base, { value: current, label: labels[current] ?? current, disabled: true }]
}

const text = (value: unknown, fallback: string) => (typeof value === 'string' && value !== '' ? value : fallback)

/** El centro de la abertura a lo largo del muro (`position[0]`) ajustado para que quepa entera; con el muro desconocido no se toca. */
const insideWall = (x: number, width: number, hostLength: number | null) =>
  hostLength === null ? x : width >= hostLength ? hostLength / 2 : clamp(x, width / 2, hostLength - width / 2)

/** La copia de una abertura va al lado sobre el mismo muro: a la derecha si cabe, si no a la izquierda, si no no hay lugar. */
function beside({ node, hostLength }: PropTarget, factoryWidth: number): Patch | null {
  if (hostLength === null) return null
  const [x, y, z] = vec3(node.position)
  const width = num(node.width, factoryWidth)
  const right = x + width + 0.15
  if (right + width / 2 <= hostLength) return { position: [roundMm(right), y, z] }
  const left = x - width - 0.15
  return left - width / 2 >= 0 ? { position: [roundMm(left), y, z] } : null
}

const doorBuilder: Builder = {
  fields: ({ node }) => {
    const type = text(node.doorType, 'hinged')
    return [
      { kind: 'select', id: 'doorType', label: 'Tipo', value: type, options: typeOptions(DOOR_TYPES, DOOR_CHOICES, type) },
      { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(num(node.width, DOOR_DEFAULTS.width)) },
      { kind: 'number', id: 'height', label: 'Alto', value: formatMeters(num(node.height, DOOR_DEFAULTS.height)) },
      { kind: 'readonly', id: 'leafCount', label: 'Hojas', value: String(num(node.leafCount, 1)) },
      { kind: 'select', id: 'openingShape', label: 'Forma del hueco', value: text(node.openingShape, 'rectangle'), options: SHAPE_OPTIONS },
    ]
  },
  patch: ({ node, hostLength }, fieldId, raw) => {
    const [x, y, z] = vec3(node.position)
    if (fieldId === 'doorType') {
      if (!(DOOR_CHOICES as readonly string[]).includes(raw) || raw === node.doorType) return null
      return { doorType: raw, leafCount: raw === 'hinged' ? 1 : 2 }
    }
    if (fieldId === 'openingShape') return raw in SHAPES && raw !== node.openingShape ? { openingShape: raw } : null
    if (fieldId === 'width') {
      const width = metersPatch(raw, LIMITS.doorWidth, num(node.width, DOOR_DEFAULTS.width))
      return width === null ? null : { width, position: [roundMm(insideWall(x, width, hostLength)), y, z] }
    }
    if (fieldId === 'height') {
      const height = metersPatch(raw, LIMITS.doorHeight, num(node.height, DOOR_DEFAULTS.height))
      // Una puerta apoya en el piso: su centro vertical es siempre la mitad de su alto.
      return height === null ? null : { height, position: [x, roundMm(height / 2), z] }
    }
    return null
  },
  subtitle: ({ node }) => {
    const leaves = num(node.leafCount, 1)
    return `${DOOR_TYPES[text(node.doorType, 'hinged')] ?? 'Puerta'} de ${leaves} ${leaves === 1 ? 'hoja' : 'hojas'}`
  },
  duplicate: (target) => beside(target, DOOR_DEFAULTS.width),
}

/** El antepecho (altura del borde inferior de la ventana sobre el piso) sale de su centro y su alto: Pascal no lo guarda. */
const sillOf = (node: PropNode) => Math.max(0, vec3(node.position)[1] - num(node.height, WINDOW_DEFAULTS.height) / 2)

const windowBuilder: Builder = {
  fields: ({ node }) => {
    const type = text(node.windowType, 'fixed')
    return [
      { kind: 'select', id: 'windowType', label: 'Tipo', value: type, options: typeOptions(WINDOW_TYPES, WINDOW_CHOICES, type) },
      { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(num(node.width, WINDOW_DEFAULTS.width)) },
      { kind: 'number', id: 'height', label: 'Alto', value: formatMeters(num(node.height, WINDOW_DEFAULTS.height)) },
      { kind: 'number', id: 'sill', label: 'Antepecho', value: formatMeters(sillOf(node)) },
      { kind: 'select', id: 'openingShape', label: 'Forma del hueco', value: text(node.openingShape, 'rectangle'), options: SHAPE_OPTIONS },
    ]
  },
  patch: ({ node, hostLength }, fieldId, raw) => {
    const [x, y, z] = vec3(node.position)
    const sill = sillOf(node)
    const height = num(node.height, WINDOW_DEFAULTS.height)
    if (fieldId === 'windowType') {
      return (WINDOW_CHOICES as readonly string[]).includes(raw) && raw !== node.windowType ? { windowType: raw } : null
    }
    if (fieldId === 'openingShape') return raw in SHAPES && raw !== node.openingShape ? { openingShape: raw } : null
    if (fieldId === 'width') {
      const width = metersPatch(raw, LIMITS.windowWidth, num(node.width, WINDOW_DEFAULTS.width))
      return width === null ? null : { width, position: [roundMm(insideWall(x, width, hostLength)), y, z] }
    }
    if (fieldId === 'height') {
      const next = metersPatch(raw, LIMITS.windowHeight, height)
      // La ventana conserva su antepecho: el centro sube o baja la mitad de lo que cambia el alto.
      return next === null ? null : { height: next, position: [x, roundMm(sill + next / 2), z] }
    }
    if (fieldId === 'sill') {
      const next = metersPatch(raw, LIMITS.windowSill, sill)
      return next === null ? null : { position: [x, roundMm(next + height / 2), z] }
    }
    return null
  },
  subtitle: ({ node }) => WINDOW_TYPES[text(node.windowType, 'fixed')] ?? 'Ventana',
  duplicate: (target) => beside(target, WINDOW_DEFAULTS.width),
}

// @@builders

const BUILDERS: Readonly<Record<string, Builder>> = {
  wall,
  zone,
  door: doorBuilder,
  window: windowBuilder,
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
