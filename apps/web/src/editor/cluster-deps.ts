import * as Core from '@pascal-app/core'
import * as Pascal from '@pascal-app/editor'
import type { ClusterDeps } from './shell/bridge/cluster'
import { type AssetLike, buildItemNode } from './templates/scene-builder'

/**
 * «Muebles desde una foto»: crea el conjunto con los mismos nodos que arma el constructor de plantillas (`buildItemNode`) y con
 * las mismas funciones que usa Pascal para duplicar (`createNodes` dentro de `runAsSingleSceneHistoryStep`, que junta todo en un
 * solo paso del historial): Deshacer quita todas las piezas de una vez. Es el único enlace real con Pascal de esta función.
 */
export function clusterDeps(): ClusterDeps {
  return {
    insertItems: ({ parentId, items }) => {
      // Los muebles son los del catálogo de Pascal (`CatalogItem`, ya con sus rutas locales); el esquema del nodo los valida al armarlos.
      const nodes = items.map((item) => buildItemNode(item.asset as unknown as AssetLike, { parentId, position: item.position, rotY: item.rotY }))
      Core.runAsSingleSceneHistoryStep(Pascal.useScene, () =>
        Pascal.useScene.getState().createNodes(nodes.map((node) => ({ node, parentId: parentId as Core.AnyNodeId }))),
      )
      return nodes.map((node) => node.id)
    },
  }
}
