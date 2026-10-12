import { useViewer } from '@pascal-app/editor'
import { appFontClasses } from '@/components/AppShell'

/**
 * Único lugar de `src/editor` que toca los almacenes de Pascal para el shell (`src/editor/shell/` usa tipos propios y una
 * prueba lo vigila). Tareas 2a y 2b: tema. La Tarea 4e lo amplía con el puente completo.
 */

/** Escena `studio` (apariencia clara), metros, y las fuentes de la interfaz en <body>, donde cuelgan los portales de Pascal. */
export function applyEditorTheme(): () => void {
  const viewer = useViewer.getState()
  viewer.setSceneTheme('studio')
  viewer.setUnit('metric')
  const classes = appFontClasses.split(' ')
  document.body.classList.add(...classes)
  return () => document.body.classList.remove(...classes)
}
