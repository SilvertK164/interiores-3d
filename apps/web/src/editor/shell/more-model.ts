import type { SnapMode } from './bridge/types'

/** Pasos de cuadrícula que admite `setGridSnapStep` de Pascal (en metros). */
export const GRID_STEPS = [
  { value: 0.5, label: '50 cm' },
  { value: 0.25, label: '25 cm' },
  { value: 0.1, label: '10 cm' },
  { value: 0.05, label: '5 cm' },
] as const

type Option = { value: SnapMode; label: string }

/** Ajuste al dibujar muros: los cuatro modos del contexto `wall` de Pascal. */
export const WALL_SNAP: readonly Option[] = [
  { value: 'grid', label: 'Cuadrícula' },
  { value: 'lines', label: 'Alineación' },
  { value: 'angles', label: 'Ángulos' },
  { value: 'off', label: 'Libre' },
]

/** Ajuste al mover muebles: los tres modos del contexto `item` (`lines` es el de las guías moradas). */
export const ITEM_SNAP: readonly Option[] = [
  { value: 'lines', label: 'Alineación' },
  { value: 'grid', label: 'Cuadrícula' },
  { value: 'off', label: 'Libre' },
]

/** Atajos de Pascal que se muestran en castellano (los que escucha `use-keyboard.ts`). */
export const SHORTCUTS: readonly { keys: string; label: string }[] = [
  { keys: 'V', label: 'Seleccionar' },
  { keys: 'B', label: 'Dibujar muros' },
  { keys: 'Z', label: 'Dibujar un ambiente' },
  { keys: 'F', label: 'Colocar muebles' },
  { keys: 'P', label: 'Pintar con materiales' },
  { keys: 'M', label: 'Medir' },
  { keys: 'X', label: 'Eliminar elementos' },
  { keys: 'R', label: 'Girar el elemento' },
  { keys: 'Esc', label: 'Cancelar lo que estás haciendo' },
  { keys: 'Supr', label: 'Borrar lo elegido' },
  { keys: 'Ctrl + Z', label: 'Deshacer' },
  { keys: 'Ctrl + Shift + Z', label: 'Rehacer' },
  { keys: 'Ctrl + C / X / V', label: 'Copiar, cortar y pegar' },
  { keys: 'Ctrl + ↑ / ↓', label: 'Cambiar de planta' },
  { keys: 'Ctrl + S', label: 'Guardar ahora' },
]

/** Funciones que llegan en una próxima versión: botones deshabilitados con "Pronto" (criterio 11 del spec 3; "Exportar plano" ya es real, spec 4). */
export const SOON_ITEMS: readonly { id: string; label: string }[] = [
  { id: 'share', label: 'Compartir' },
  { id: 'render', label: 'Renderizar' },
]
