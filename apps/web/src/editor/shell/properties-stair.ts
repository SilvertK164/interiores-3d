import { formatMeters } from '@/lib/format'
import { countPatch, num } from './properties-fields'
import { type Builder, type Patch, type PropNode, metersPatch } from './properties-model'

/**
 * Escalera curva o de caracol: `stairParametrics` (`nodes/dist/stair/parametrics.js`) pone ancho mín 0,4 y 2 a 32
 * escalones; el panel de Pascal (`stair/panel.js`) topa el ancho en 10. El esquema (`StairNode`) no tiene topes.
 */
export const STAIR_LIMITS = { width: [0.4, 10], stepCount: [2, 32] } as const satisfies Record<string, readonly [number, number]>
/** Tramo: `stairSegmentParametrics` (`nodes/dist/stair-segment/parametrics.js`): ancho mín 0,5 y 2 a 30 escalones. */
export const FLIGHT_LIMITS = { width: [0.5, 10], stepCount: [2, 30] } as const satisfies Record<string, readonly [number, number]>

/** De fábrica en `StairNode` y `StairSegmentNode`: 1 m de ancho y 10 escalones. */
const DEFAULTS = { width: 1, stepCount: 10 } as const
const TYPES: Readonly<Record<string, string>> = { straight: 'Recta', curved: 'Curva', spiral: 'Caracol' }

const isCurved = (node: PropNode) => node.stairType === 'curved' || node.stairType === 'spiral'
const widthOf = (node: PropNode) => num(node.width, DEFAULTS.width)
const stepsOf = (node: PropNode) => Math.round(num(node.stepCount, DEFAULTS.stepCount))
const change = (key: string, value: number | null): Patch | null => (value === null ? null : { [key]: value })

/** Ancho y escalones con los límites que le toquen (los mismos campos en la escalera curva y en el tramo). */
function patchOf(node: PropNode, fieldId: string, raw: string, limits: typeof STAIR_LIMITS | typeof FLIGHT_LIMITS): Patch | null {
  if (fieldId === 'width') return change('width', metersPatch(raw, limits.width, widthOf(node)))
  if (fieldId === 'stepCount') return change('stepCount', countPatch(raw, limits.stepCount, stepsOf(node)))
  return null
}

export const stairBuilder: Builder = {
  fields: ({ node }) =>
    isCurved(node)
      ? [
          { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(widthOf(node)) },
          { kind: 'number', id: 'stepCount', label: 'Escalones', value: String(stepsOf(node)) },
        ]
      : [{ kind: 'readonly', id: 'tramos', label: 'Tramos', value: String(Array.isArray(node.children) ? node.children.length : 0) }],
  patch: ({ node }, fieldId, raw) => (isCurved(node) ? patchOf(node, fieldId, raw, STAIR_LIMITS) : null),
  subtitle: ({ node }) => (isCurved(node) ? (TYPES[String(node.stairType)] ?? '') : 'Elige un tramo para cambiar sus medidas'),
}

const isLanding = (node: PropNode) => node.segmentType === 'landing'

export const flightBuilder: Builder = {
  fields: ({ node }) => [
    { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(widthOf(node)) },
    ...(isLanding(node) ? [] : [{ kind: 'number' as const, id: 'stepCount', label: 'Escalones', value: String(stepsOf(node)) }]),
  ],
  patch: ({ node }, fieldId, raw) => (fieldId === 'stepCount' && isLanding(node) ? null : patchOf(node, fieldId, raw, FLIGHT_LIMITS)),
  title: ({ node }) => (isLanding(node) ? 'Descanso' : 'Tramo de escalera'),
  // Un descanso no tiene subtítulo: la ficha pinta el subtítulo solo si hay texto.
  subtitle: ({ node }) => (isLanding(node) ? '' : `${stepsOf(node)} escalones`),
}
