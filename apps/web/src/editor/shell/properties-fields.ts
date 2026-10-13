import type { FieldView } from './ui/PropertiesCard'

/** Un número finito o, si no lo es, el valor de respaldo (los nodos de Pascal pueden venir sin el campo). */
export const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)

/** Un campo de cantidad: solo dígitos ("3"); fuera del rango se ajusta; solo devuelve el valor si es distinto del actual. */
export function countPatch(raw: string, range: readonly [number, number], current: number): number | null {
  if (!/^\s*\d+\s*$/.test(raw)) return null
  const next = Math.min(range[1], Math.max(range[0], Number(raw)))
  return next === current ? null : next
}

const YES_NO = [
  { value: 'yes', label: 'Sí' },
  { value: 'no', label: 'No' },
] as const

/** Un interruptor del panel: la ficha solo conoce números, textos y listas, así que va como lista de Sí y No. */
export const toggleField = (id: string, label: string, on: boolean): FieldView => ({
  kind: 'select',
  id,
  label,
  value: on ? 'yes' : 'no',
  options: YES_NO,
})

/** Lo que eligió la persona en un interruptor: `null` si no es Sí ni No, o si ya estaba así. */
export function togglePatch(raw: string, current: boolean): boolean | null {
  if (raw !== 'yes' && raw !== 'no') return null
  const next = raw === 'yes'
  return next === current ? null : next
}
