/** Nombre de una planta cuando no tiene uno propio: `Planta baja`, `Planta N` o `Sótano N` (Pascal las llama Ground Floor, Floor N y Basement N). */
export function defaultLevelName(level: number): string {
  if (level === 0) return 'Planta baja'
  return level > 0 ? `Planta ${level}` : `Sótano ${-level}`
}

const ENGLISH_FLOOR = /^Floor (\d+)$/
const ENGLISH_BASEMENT = /^Basement (\d+)$/

/** Cómo se MUESTRA una planta (D10): el nombre guardado no se cambia; los vacíos y los que Pascal inventó en inglés salen en castellano. */
export function levelDisplayName(level: { name?: string | null; level: number }): string {
  const name = level.name?.trim()
  if (!name) return defaultLevelName(level.level)
  if (name === 'Ground Floor') return 'Planta baja'
  const floor = ENGLISH_FLOOR.exec(name)
  if (floor) return `Planta ${floor[1]}`
  const basement = ENGLISH_BASEMENT.exec(name)
  if (basement) return `Sótano ${basement[1]}`
  return name
}

/** La herramienta de ambientes de Pascal los nombra `Zone N`; en pantalla se dice "ambiente", nunca "zona". */
export function zoneDisplayName(name?: string | null): string {
  const text = name?.trim()
  if (!text) return 'Ambiente sin nombre'
  const generated = /^Zone (\d+)$/.exec(text)
  return generated ? `Ambiente ${generated[1]}` : text
}
