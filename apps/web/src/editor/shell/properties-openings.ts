import { formatMeters } from '@/lib/format'
import type { Builder, Patch, PropNode, PropTarget } from './properties-model'
import { clamp, LIMITS, metersPatch, num, roundMm, text, vec3 } from './properties-units'

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
const WINDOW_CHOICES = [
  'fixed',
  'sliding',
  'casement',
  'awning',
  'single-hung',
  'double-hung',
] as const
const SHAPES: Readonly<Record<string, string>> = {
  rectangle: 'Rectangular',
  rounded: 'Redondeado',
  arch: 'Arco',
}
const SHAPE_OPTIONS = Object.entries(SHAPES).map(([value, label]) => ({ value, label }))

/** Las opciones que se pueden elegir; si el nodo trae otra (una puerta plegable), se muestra deshabilitada para decir la verdad. */
function typeOptions(
  labels: Readonly<Record<string, string>>,
  choices: readonly string[],
  current: string,
) {
  const base = choices.map((value) => ({ value, label: labels[value] ?? value }))
  return choices.includes(current)
    ? base
    : [...base, { value: current, label: labels[current] ?? current, disabled: true }]
}

/** El centro de la abertura a lo largo del muro (`position[0]`) ajustado para que quepa entera; con el muro desconocido no se toca. */
const insideWall = (x: number, width: number, hostLength: number | null) =>
  hostLength === null
    ? x
    : width >= hostLength
      ? hostLength / 2
      : clamp(x, width / 2, hostLength - width / 2)

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

export const doorBuilder: Builder = {
  fields: ({ node }) => {
    const type = text(node.doorType, 'hinged')
    return [
      {
        kind: 'select',
        id: 'doorType',
        label: 'Tipo',
        value: type,
        options: typeOptions(DOOR_TYPES, DOOR_CHOICES, type),
      },
      {
        kind: 'number',
        id: 'width',
        label: 'Ancho',
        value: formatMeters(num(node.width, DOOR_DEFAULTS.width)),
      },
      {
        kind: 'number',
        id: 'height',
        label: 'Alto',
        value: formatMeters(num(node.height, DOOR_DEFAULTS.height)),
      },
      { kind: 'readonly', id: 'leafCount', label: 'Hojas', value: String(num(node.leafCount, 1)) },
      {
        kind: 'select',
        id: 'openingShape',
        label: 'Forma del hueco',
        value: text(node.openingShape, 'rectangle'),
        options: SHAPE_OPTIONS,
      },
    ]
  },
  patch: ({ node, hostLength }, fieldId, raw) => {
    const [x, y, z] = vec3(node.position)
    if (fieldId === 'doorType') {
      if (!(DOOR_CHOICES as readonly string[]).includes(raw) || raw === node.doorType) return null
      return { doorType: raw, leafCount: raw === 'hinged' ? 1 : 2 }
    }
    if (fieldId === 'openingShape')
      return raw in SHAPES && raw !== node.openingShape ? { openingShape: raw } : null
    if (fieldId === 'width') {
      const width = metersPatch(raw, LIMITS.doorWidth, num(node.width, DOOR_DEFAULTS.width))
      return width === null
        ? null
        : { width, position: [roundMm(insideWall(x, width, hostLength)), y, z] }
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
const sillOf = (node: PropNode) =>
  Math.max(0, vec3(node.position)[1] - num(node.height, WINDOW_DEFAULTS.height) / 2)

export const windowBuilder: Builder = {
  fields: ({ node }) => {
    const type = text(node.windowType, 'fixed')
    return [
      {
        kind: 'select',
        id: 'windowType',
        label: 'Tipo',
        value: type,
        options: typeOptions(WINDOW_TYPES, WINDOW_CHOICES, type),
      },
      {
        kind: 'number',
        id: 'width',
        label: 'Ancho',
        value: formatMeters(num(node.width, WINDOW_DEFAULTS.width)),
      },
      {
        kind: 'number',
        id: 'height',
        label: 'Alto',
        value: formatMeters(num(node.height, WINDOW_DEFAULTS.height)),
      },
      { kind: 'number', id: 'sill', label: 'Antepecho', value: formatMeters(sillOf(node)) },
      {
        kind: 'select',
        id: 'openingShape',
        label: 'Forma del hueco',
        value: text(node.openingShape, 'rectangle'),
        options: SHAPE_OPTIONS,
      },
    ]
  },
  patch: ({ node, hostLength }, fieldId, raw) => {
    const [x, y, z] = vec3(node.position)
    const sill = sillOf(node)
    const height = num(node.height, WINDOW_DEFAULTS.height)
    if (fieldId === 'windowType') {
      return (WINDOW_CHOICES as readonly string[]).includes(raw) && raw !== node.windowType
        ? { windowType: raw }
        : null
    }
    if (fieldId === 'openingShape')
      return raw in SHAPES && raw !== node.openingShape ? { openingShape: raw } : null
    if (fieldId === 'width') {
      const width = metersPatch(raw, LIMITS.windowWidth, num(node.width, WINDOW_DEFAULTS.width))
      return width === null
        ? null
        : { width, position: [roundMm(insideWall(x, width, hostLength)), y, z] }
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
