import { formatMeters, formatSize } from '@/lib/format'
import { num } from './properties-fields'
import { type Builder, type Patch, type PropNode, metersPatch } from './properties-model'
import type { FieldView } from './ui/PropertiesCard'

/**
 * Rangos del gabinete y de su módulo: los de `cabinetParametrics` y `cabinetModuleParametrics`
 * (`nodes/dist/cabinet/parametrics.js`), que coinciden con `CabinetNode` y `CabinetModuleNode`
 * (`core/dist/schema/nodes/cabinet.js`). Los tiradores del lienzo topan antes (1,2 m de ancho y 0,8 m de fondo,
 * `resize-limits.js`); aquí se admite todo lo que el esquema vuelve a cargar.
 */
export const CABINET_LIMITS = {
  width: [0.3, 3],
  depth: [0.3, 1.2],
  carcassHeight: [0.4, 2.4],
} as const satisfies Record<string, readonly [number, number]>

/** De fábrica (`defaults` de la definición y `CABINET_METRIC_DEFAULTS`). */
const DEFAULTS = { width: 0.5, depth: 0.6, carcassHeight: 0.8 } as const

const size = (node: PropNode) => ({
  width: num(node.width, DEFAULTS.width),
  depth: num(node.depth, DEFAULTS.depth),
  carcassHeight: num(node.carcassHeight, DEFAULTS.carcassHeight),
})

/** Los módulos de una hilera cuelgan de ella con ids `cabinet-module_…` (la misma regla de `cabinetHandles`). */
const modulesOf = (node: PropNode) =>
  Array.isArray(node.children) ? node.children.filter((id) => typeof id === 'string' && (id.startsWith('cabinet_') || id.startsWith('cabinet-module_'))).length : 0

const boxFields = (node: PropNode): FieldView[] => {
  const current = size(node)
  return [
    { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(current.width) },
    { kind: 'number', id: 'depth', label: 'Fondo', value: formatMeters(current.depth) },
    { kind: 'number', id: 'carcassHeight', label: 'Alto del cuerpo', value: formatMeters(current.carcassHeight) },
  ]
}

function boxPatch(node: PropNode, fieldId: string, raw: string): Patch | null {
  if (fieldId !== 'width' && fieldId !== 'depth' && fieldId !== 'carcassHeight') return null
  const value = metersPatch(raw, CABINET_LIMITS[fieldId], size(node)[fieldId])
  return value === null ? null : { [fieldId]: value }
}

const boxSubtitle = (node: PropNode) => formatSize(size(node).width, size(node).depth)

export const cabinetBuilder: Builder = {
  fields: ({ node }) => {
    const modules = modulesOf(node)
    return modules > 0 ? [{ kind: 'readonly', id: 'modules', label: 'Módulos', value: String(modules) }] : boxFields(node)
  },
  patch: ({ node }, fieldId, raw) => (modulesOf(node) > 0 ? null : boxPatch(node, fieldId, raw)),
  subtitle: ({ node }) => {
    const modules = modulesOf(node)
    return modules > 0 ? `${modules} ${modules === 1 ? 'módulo' : 'módulos'}` : boxSubtitle(node)
  },
}

export const cabinetModuleBuilder: Builder = {
  fields: ({ node }) => boxFields(node),
  patch: ({ node }, fieldId, raw) => boxPatch(node, fieldId, raw),
  subtitle: ({ node }) => boxSubtitle(node),
}
