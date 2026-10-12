import type { CoreDeps } from './core'
import type { Arming } from '../dock-model'
import type { SnapMode } from './types'

/**
 * Armar herramientas con las mismas secuencias que las teclas de Pascal (`use-keyboard.ts`, `measurement-control.tsx`):
 * `armToolMode` solo cambia la fase al armar desde `site`, `stair` y `zone` solo existen en `structure` y la capa `zones`
 * queda puesta si no se devuelve a `elements`.
 */
export function createToolsSlice(deps: CoreDeps) {
  const editor = () => deps.editor.getState()
  const elementsLayer = () => {
    if (editor().structureLayer !== 'elements') editor().setStructureLayer('elements')
  }
  return {
    arm(arming: Arming): void {
      if (arming.kind === 'select') {
        editor().armToolMode({ mode: 'select' })
      } else if (arming.kind === 'delete') {
        editor().armToolMode({ mode: 'delete' })
      } else if (arming.kind === 'furniture') {
        editor().setPhase('furnish')
        editor().armToolMode({ mode: 'build', tool: 'item' })
      } else if (arming.kind === 'paint') {
        editor().setPhase('structure')
        elementsLayer()
        editor().armMaterialPaint()
      } else if (arming.kind === 'measure') {
        editor().setPhase('structure')
        elementsLayer()
        editor().setLastMeasurementKind(arming.measure)
        editor().setToolDefaults('measurement', { kind: arming.measure })
        editor().setMode('build')
        editor().setTool('measurement')
      } else {
        editor().setPhase('structure')
        if (arming.tool !== 'zone') elementsLayer()
        editor().armToolMode({ mode: 'build', tool: arming.tool })
      }
    },
    setGridStep(step: number): void {
      editor().setGridSnapStep(step)
    },
    setSnap(context: 'wall' | 'item', mode: SnapMode): void {
      editor().setSnappingMode(context, mode)
    },
  }
}
