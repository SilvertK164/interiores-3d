import type { MaterialItemLike } from '../materials-model'
import type { CoreDeps } from './core'

export type MaterialsModelLike = {
  items: readonly MaterialItemLike[]
  /** Id (sin el prefijo `library:`) del material armado para pintar, o `null`. */
  selectedId: string | null
  select(id: string): void
}

export type MaterialsDeps = {
  /** Hook de Pascal: `useMaterialPaintPanelModel` + la lista fija de la biblioteca (ver `pascal-bridge.ts`). */
  useMaterialsModel(): MaterialsModelLike
}

export function createMaterialsSlice(deps: CoreDeps & MaterialsDeps) {
  return {
    /** Hook de lectura para el panel de materiales. En Ver, elegir un material no hace nada. */
    useMaterials(): MaterialsModelLike {
      const model = deps.useMaterialsModel()
      return {
        ...model,
        select(id: string) {
          if (!deps.scene.getState().readOnly) model.select(id)
        },
      }
    },
  }
}
