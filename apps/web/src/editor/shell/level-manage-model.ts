import { formatMeters } from '@/lib/format'
import { LEVEL_HEIGHT_LIMITS } from './bridge/level-manage'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Lo que se pierde al borrar una planta, dicho como lo lee una persona. */
export function deleteSummary(zones: number, elements: number): string {
  if (zones === 0 && elements === 0) return 'La planta está vacía: no se pierde nada.'
  const parts = []
  if (zones > 0) parts.push(plural(zones, 'ambiente', 'ambientes'))
  if (elements > 0) parts.push(plural(elements, 'elemento', 'elementos'))
  return `Se borrarán ${parts.join(' y ')}.`
}

/** Por qué no se puede borrar (o `null` si se puede). */
export const deleteBlockedReason = (canDelete: boolean): string | null => (canDelete ? null : 'No se puede eliminar la única planta del proyecto.')

export const heightHint = () => `Entre ${formatMeters(LEVEL_HEIGHT_LIMITS[0])} y ${formatMeters(LEVEL_HEIGHT_LIMITS[1])}`

export const stairNotice = (broken: number): string | null =>
  broken === 0 ? null : `Revisa las escaleras: ${plural(broken, 'ya no conecta', 'ya no conectan')} con la planta de arriba.`
