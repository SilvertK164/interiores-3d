import type { SceneGraph } from '@interiores/contract'
import { type LocalItemsManifest, localizeCatalogItem } from './catalog'
import localManifest from './local-items.json'

/** La carpeta de un mueble del catálogo según su `src`: local (`/items/<carpeta>/model.glb`) o del bucket de Pascal. */
const FOLDER = /(?:^\/items\/|\/items\/system\/)([^/]+)\/model\.glb$/
const BUCKET = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system'

type ItemAsset = { id?: string; src?: string; thumbnail?: string; floorPlanUrl?: string } & Record<string, unknown>

/**
 * Los proyectos guardados llevan en cada ítem una copia del descriptor del mueble con rutas de cuando se crearon: si desde entonces
 * cambiaron los archivos (por ejemplo, `floor-plan.svg` -> `floor-plan.png`) el plano 2D muestra una imagen rota. Al cargar la
 * escena se reescriben `src`, `thumbnail` y `floorPlanUrl` con el mismo criterio del catálogo (`localizeCatalogItem`); los ítems
 * de otro origen o con ids que no están en el manifiesto local no se tocan. Si nada cambia devuelve el mismo grafo.
 */
export function refreshItemAssets(graph: SceneGraph, manifest: LocalItemsManifest = localManifest): SceneGraph {
  let changed = false
  const nodes = { ...graph.nodes } as Record<string, unknown>
  for (const [id, node] of Object.entries(graph.nodes)) {
    const item = node as { type?: string; asset?: ItemAsset }
    const asset = item.asset
    const folder = asset?.src ? FOLDER.exec(asset.src)?.[1] : undefined
    if (item.type !== 'item' || !asset?.src || !folder) continue
    const local = localizeCatalogItem<{ id: string; src: string; thumbnail?: string; floorPlanUrl?: string }>({ id: asset.id ?? '', src: `${BUCKET}/${folder}/model.glb` }, manifest)
    if (!local) continue
    const next: ItemAsset = { ...asset, src: local.src }
    for (const key of ['thumbnail', 'floorPlanUrl'] as const) {
      if (local[key] === undefined) delete next[key]
      else next[key] = local[key]
    }
    if (next.src === asset.src && next.thumbnail === asset.thumbnail && next.floorPlanUrl === asset.floorPlanUrl && Object.keys(next).length === Object.keys(asset).length) continue
    nodes[id] = { ...item, asset: next }
    changed = true
  }
  return changed ? ({ ...graph, nodes } as SceneGraph) : graph
}
