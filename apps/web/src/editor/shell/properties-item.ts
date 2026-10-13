import { nameEs } from '@/lib/catalog-es'
import { formatMeters, formatSize } from '@/lib/format'
import type { Builder, PropNode } from './properties-model'
import { LIMITS, metersPatch, num, parseDegrees, SHIFT, text, vec3 } from './properties-units'

/** Las medidas de un mueble: las del modelo (`asset.dimensions`) por la escala de cada eje. */
function itemAxes(node: PropNode) {
  const asset = (node.asset ?? {}) as Record<string, unknown>
  const dimensions = Array.isArray(asset.dimensions) ? asset.dimensions : []
  const scale = Array.isArray(node.scale) ? node.scale : []
  return [0, 1, 2].map((axis) => {
    const base = num(dimensions[axis], 1)
    const factor = num(scale[axis], 1)
    return { base, factor, size: base * factor }
  })
}

/** El giro del mueble en grados, a un decimal (Pascal lo guarda en radianes en `rotation[1]`). */
const itemDegrees = (node: PropNode) => {
  const degrees = (vec3(node.rotation)[1] * 180) / Math.PI
  return Math.round((((degrees % 360) + 360) % 360) * 10) / 10
}

const ITEM_AXES = [
  { id: 'width', label: 'Ancho' },
  { id: 'height', label: 'Alto' },
  { id: 'depth', label: 'Profundidad' },
] as const

export const itemBuilder: Builder = {
  fields: ({ node }) => {
    const axes = itemAxes(node)
    return [
      ...ITEM_AXES.map(({ id, label }, axis) => ({
        kind: 'number' as const,
        id,
        label,
        value: formatMeters(axes[axis]?.size ?? 0),
      })),
      {
        kind: 'number',
        id: 'rotation',
        label: 'Giro',
        value: `${String(itemDegrees(node)).replace('.', ',')}°`,
      },
    ]
  },
  patch: ({ node }, fieldId, raw) => {
    if (fieldId === 'rotation') {
      const degrees = parseDegrees(raw)
      if (degrees === null || Math.abs(degrees - itemDegrees(node)) < 0.05) return null
      const [rx, , rz] = vec3(node.rotation)
      return { rotation: [rx, Math.round(((degrees * Math.PI) / 180) * 10000) / 10000, rz] }
    }
    const axis = ITEM_AXES.findIndex((a) => a.id === fieldId)
    const axes = itemAxes(node)
    const current = axes[axis]
    if (!current || current.base <= 0) return null
    const size = metersPatch(raw, LIMITS.itemSize, current.size)
    if (size === null) return null
    return {
      scale: axes.map((a, i) =>
        i === axis ? Math.round((size / a.base) * 10000) / 10000 : a.factor,
      ),
    }
  },
  title: ({ node }) => {
    const asset = (node.asset ?? {}) as Record<string, unknown>
    return nameEs(text(asset.id, ''), text(asset.name, 'Mueble'))
  },
  subtitle: ({ node }) => {
    const [width, , depth] = itemAxes(node)
    return formatSize(width?.size ?? 0, depth?.size ?? 0)
  },
  duplicate: ({ node }) => {
    if (node.wallId || node.roofSegmentId) return null
    const [x, y, z] = vec3(node.position)
    return { position: [x + SHIFT, y, z + SHIFT] }
  },
}
