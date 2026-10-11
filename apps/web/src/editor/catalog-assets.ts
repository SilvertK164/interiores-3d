import { type LocalItemsManifest, localizeCatalogItem } from './catalog'
import localManifest from './local-items.json'
import type { AssetLike } from './templates/scene-builder'

type CatalogItem = Parameters<typeof localizeCatalogItem>[0]

/** Las piezas del catálogo de Pascal que tienen modelo local (`public/items/`), con sus rutas ya reescritas. */
export function localizeCatalog<T extends CatalogItem>(items: readonly T[], manifest: LocalItemsManifest = localManifest): T[] {
  return items.flatMap((item) => localizeCatalogItem(item, manifest) ?? [])
}

/** Mapa id → pieza local que consume `buildScene`. Lo usan el generador de plantillas y el laboratorio. */
export function buildAssetMap(items: readonly CatalogItem[], manifest: LocalItemsManifest = localManifest): Map<string, AssetLike> {
  return new Map(localizeCatalog(items, manifest).map((item) => [item.id, item as unknown as AssetLike] as const))
}
