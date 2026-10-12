import { DECISIONS, type Decisions } from '../decisions'
import type { CatalogItemLike } from '../furniture-model'
import type { CoreDeps } from './core'

export type CatalogDeps = {
  /** `activateCatalogItem` de Pascal (editor): elige el ítem y arma `item` (o su herramienta propia) sin tocar la fase. */
  activateCatalogItem(item: CatalogItemLike): void
}

export function createCatalogSlice(
  deps: CoreDeps & CatalogDeps,
  decisions: Pick<Decisions, 'furnishPhaseBeforeItem'> = DECISIONS,
) {
  return {
    /** Elegir una tarjeta del catálogo para colocar ese mueble. En Ver no se coloca nada. */
    placeItem(item: CatalogItemLike): void {
      if (deps.scene.getState().readOnly) return
      if (decisions.furnishPhaseBeforeItem) deps.editor.getState().setPhase('furnish')
      deps.activateCatalogItem(item)
    },
  }
}
