import { cabinetDefaults, shelfPatch, type PresetArming } from '../presets-model'
import type { CoreDeps } from './core'

export type PresetsDeps = {
  /** Desde ahora cada nodo de ese tipo que cree la herramienta se completa con el parche, en el mismo paso de Deshacer. */
  armNodePatch(nodeType: 'shelf' | 'stair', patch: Record<string, unknown>): void
  /** Deja de completar los nodos nuevos. */
  clearNodePatch(): void
}

/**
 * "A medida": las herramientas de Pascal para estantes y escaleras siempre crean el mismo nodo (un cubículo de 3 por 2, una escalera
 * recta) y no leen `toolDefaults`; la de gabinetes sí (`toolDefaults.cabinet`, mezclado en cada módulo). Por eso el estante y la
 * escalera se completan al crearse (`armNodePatch`) y el gabinete se arma con sus valores. Al dejar la herramienta se sueltan.
 */
export function createPresetsSlice(deps: CoreDeps & PresetsDeps) {
  const editor = () => deps.editor.getState()
  let stopWatching: (() => void) | null = null
  const release = () => {
    stopWatching?.()
    stopWatching = null
    deps.clearNodePatch()
    editor().setToolDefaults('cabinet', null)
  }
  return {
    placePreset(arming: PresetArming): void {
      if (deps.scene.getState().readOnly) return
      release()
      const tool = arming.kind === 'cabinet' ? 'cabinet' : arming.kind
      if (arming.kind === 'shelf') {
        const patch = shelfPatch(arming.style)
        if (Object.keys(patch).length > 0) deps.armNodePatch('shelf', patch)
      } else if (arming.kind === 'cabinet') {
        editor().setToolDefaults('cabinet', cabinetDefaults(arming.preset))
      } else if (arming.stairType !== 'straight') {
        deps.armNodePatch('stair', { stairType: arming.stairType })
      }
      editor().setPhase(arming.kind === 'stair' ? 'structure' : 'furnish')
      if (arming.kind === 'stair' && editor().structureLayer !== 'elements') editor().setStructureLayer('elements')
      editor().armToolMode({ mode: 'build', tool })
      stopWatching = deps.editor.subscribe(() => {
        if (editor().tool !== tool) release()
      })
    },
  }
}
