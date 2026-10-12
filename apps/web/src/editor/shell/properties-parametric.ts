import { formatMeters, formatSize } from '@/lib/format'
import { cabinetBuilder, cabinetModuleBuilder } from './properties-cabinet'
import { countPatch, num, toggleField, togglePatch } from './properties-fields'
import { type Builder, type Patch, type PropNode, metersPatch } from './properties-model'
import { flightBuilder, stairBuilder } from './properties-stair'
import type { FieldView } from './ui/PropertiesCard'

/**
 * Rangos del estante: los de `ShelfNode` (`core/dist/schema/nodes/shelf.js`) y de `sanitizeShelfDimensions`
 * (`nodes/dist/shelf/dimensions.js`). El inspector de Pascal (`shelfParametrics`) solo pone el mínimo (`max: 1000`),
 * pero un valor sobre el máximo del esquema no vuelve a cargar.
 */
export const SHELF_LIMITS = {
  width: [0.3, 3],
  depth: [0.1, 1],
  height: [0.05, 2.5],
  rows: [1, 8],
  columns: [1, 6],
} as const satisfies Record<string, readonly [number, number]>

/** Lo que Pascal asume cuando el estante no trae el campo (los `default` de `ShelfNode`). */
const SHELF_DEFAULTS = { width: 1.2, depth: 0.3, height: 0.9, rows: 1, columns: 1 } as const

const SHELF_STYLES: Readonly<Record<string, string>> = {
  'wall-shelf': 'Estante de pared',
  bookshelf: 'Biblioteca',
  'open-rack': 'Góndola',
  cubby: 'Cubículos',
}

/** Qué columnas e interruptores tiene cada estilo (los `visibleIf` de `shelfParametrics`). */
const SHELF_SHOWS: Readonly<Record<string, readonly string[]>> = {
  'wall-shelf': [],
  bookshelf: ['columns', 'withSides', 'withBack', 'withBottom'],
  'open-rack': ['withBack'],
  cubby: ['columns', 'withBottom'],
}

/** Los interruptores: id, rótulo y valor que Pascal asume si el nodo no lo trae. */
const SHELF_FLAGS = [
  ['withSides', 'Paneles laterales', true],
  ['withBack', 'Panel trasero', false],
  ['withBottom', 'Tabla de base', false],
] as const

const styleOf = (node: PropNode) => (typeof node.style === 'string' && node.style in SHELF_STYLES ? node.style : 'wall-shelf')
const flagOf = (node: PropNode, id: string, fallback: boolean) => (typeof node[id] === 'boolean' ? (node[id] as boolean) : fallback)
const shelfSize = (node: PropNode) => ({
  width: num(node.width, SHELF_DEFAULTS.width),
  depth: num(node.depth, SHELF_DEFAULTS.depth),
  height: num(node.height, SHELF_DEFAULTS.height),
  rows: Math.round(num(node.rows, SHELF_DEFAULTS.rows)),
  columns: Math.round(num(node.columns, SHELF_DEFAULTS.columns)),
})
const change = (key: string, value: boolean | number | null): Patch | null => (value === null ? null : { [key]: value })

const shelfBuilder: Builder = {
  fields: ({ node }) => {
    const shows = SHELF_SHOWS[styleOf(node)] ?? []
    const size = shelfSize(node)
    const fields: FieldView[] = [
      { kind: 'readonly', id: 'style', label: 'Estilo', value: SHELF_STYLES[styleOf(node)] ?? '' },
      { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(size.width) },
      { kind: 'number', id: 'depth', label: 'Fondo', value: formatMeters(size.depth) },
      { kind: 'number', id: 'height', label: 'Alto', value: formatMeters(size.height) },
      { kind: 'number', id: 'rows', label: 'Filas', value: String(size.rows) },
    ]
    if (shows.includes('columns')) fields.push({ kind: 'number', id: 'columns', label: 'Columnas', value: String(size.columns) })
    for (const [id, label, fallback] of SHELF_FLAGS) if (shows.includes(id)) fields.push(toggleField(id, label, flagOf(node, id, fallback)))
    return fields
  },
  patch: ({ node }, fieldId, raw) => {
    const shows = SHELF_SHOWS[styleOf(node)] ?? []
    const size = shelfSize(node)
    if (fieldId === 'width') return change('width', metersPatch(raw, SHELF_LIMITS.width, size.width))
    if (fieldId === 'depth') return change('depth', metersPatch(raw, SHELF_LIMITS.depth, size.depth))
    if (fieldId === 'height') return change('height', metersPatch(raw, SHELF_LIMITS.height, size.height))
    if (fieldId === 'rows') return change('rows', countPatch(raw, SHELF_LIMITS.rows, size.rows))
    if (fieldId === 'columns') return shows.includes('columns') ? change('columns', countPatch(raw, SHELF_LIMITS.columns, size.columns)) : null
    const flag = SHELF_FLAGS.find(([id]) => id === fieldId)
    return flag && shows.includes(fieldId) ? change(fieldId, togglePatch(raw, flagOf(node, fieldId, flag[2]))) : null
  },
  title: ({ node }) => SHELF_STYLES[styleOf(node)] ?? 'Estante',
  subtitle: ({ node }) => formatSize(shelfSize(node).width, shelfSize(node).depth),
  duplicate: ({ node }) => {
    const [x, y, z] = Array.isArray(node.position) ? node.position : [0, 0, 0]
    return { position: [num(x, 0) + 0.5, num(y, 0), num(z, 0) + 0.5] }
  },
}

/** Los tipos paramétricos con panel propio (estante aquí; gabinete en 9j y escalera en 9k). */
export const PARAMETRIC_BUILDERS: Readonly<Record<string, Builder>> = {
  shelf: shelfBuilder,
  cabinet: cabinetBuilder,
  'cabinet-module': cabinetModuleBuilder,
  stair: stairBuilder,
  'stair-segment': flightBuilder,
}
