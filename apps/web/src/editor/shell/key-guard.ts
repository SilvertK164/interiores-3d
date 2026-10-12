export type KeyEventLike = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey'>
export type KeyFamily = 'tool' | 'delete' | 'clipboard' | 'history' | 'pan'
export type TrapContext = { mode: 'ver' | 'editar'; walking: boolean; inShell: boolean; editable: boolean }

/** Atajos de una sola tecla de Pascal (`hooks/use-keyboard.ts`): fases, herramientas, giro y pincel. */
const TOOL_KEYS = new Set(['1', '2', '3', 'f', 'z', 'm', 'v', 'b', 'x', 'p', 'g', 'r', 't', 'e', 'c', '[', ']'])
/** Teclas físicas con las que Pascal mueve la cámara (`lib/keyboard-pan.ts`). */
const PAN_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'])

/** A qué familias de atajos de Pascal pertenece la tecla. Las herramientas van por `key` y el desplazamiento por `code`, como en Pascal. */
export function keyFamilies(event: KeyEventLike): KeyFamily[] {
  const key = event.key.toLowerCase()
  const chord = event.ctrlKey || event.metaKey
  const families: KeyFamily[] = []
  if (event.key === 'Delete' || event.key === 'Backspace') families.push('delete')
  else if (chord) {
    if (key === 'z') families.push('history')
    else if (key === 'c' || key === 'x' || key === 'v') families.push('clipboard')
  } else if (TOOL_KEYS.has(key)) families.push('tool')
  if (!chord && PAN_CODES.has(event.code)) families.push('pan')
  return families
}

/** ¿Se corta el camino de esta tecla hacia Pascal? Ver la tabla de reglas de la Tarea 11a. */
export function shouldTrap(family: KeyFamily, { mode, walking, inShell, editable }: TrapContext): boolean {
  if (editable || walking) return false
  if (mode === 'ver') return family === 'pan' ? inShell : true
  return inShell && family !== 'history'
}
