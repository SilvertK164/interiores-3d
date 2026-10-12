export type LegendEntry = {
  kind: 'zone' | 'material'
  label: string
  /** Color de la muestra (hexadecimal). */
  color: string
  /** Solo los ambientes: metros cuadrados. */
  areaM2?: number
}

export type LegendView = { shown: LegendEntry[]; more: number }

/** Ambientes por nombre y después los materiales del piso, sin repetir el mismo material. */
export function sortLegend(entries: readonly LegendEntry[]): LegendEntry[] {
  const byLabel = (a: LegendEntry, b: LegendEntry) => a.label.localeCompare(b.label, 'es')
  const zones = entries.filter((entry) => entry.kind === 'zone').sort(byLabel)
  const seen = new Set<string>()
  const materials = entries
    .filter((entry) => entry.kind === 'material')
    .sort(byLabel)
    .filter((entry) => {
      const key = entry.label.toLocaleLowerCase('es')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  return [...zones, ...materials]
}

/**
 * Lo que entra en `capacity` filas. Si no entran todos, la última fila es la línea "y N más" (`more` > 0) y se muestran
 * `capacity - 1`. Con capacidad 0 no hay dónde dibujar nada (`shown` vacío) pero `more` cuenta lo que quedó fuera.
 */
export function buildLegend(entries: readonly LegendEntry[], capacity: number): LegendView {
  if (entries.length <= capacity) return { shown: [...entries], more: 0 }
  const rows = Math.max(0, capacity - 1)
  return { shown: entries.slice(0, rows), more: entries.length - rows }
}
