const BUCKET_PREFIX = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system/'

export type LocalItemsManifest = Record<string, string[]>

type CatalogLike = { id: string; src: string; thumbnail?: string; floorPlanUrl?: string }

/**
 * Reescribe un ítem del catálogo de Pascal para servirlo desde `public/items/<id>/`.
 * Devuelve `null` si el ítem no tiene modelo local (los 11 que solo viven en el bucket de Pascal).
 */
export function localizeCatalogItem<T extends CatalogLike>(item: T, manifest: LocalItemsManifest): T | null {
  const files = manifest[item.id]
  if (!files?.includes('model.glb') || !item.src.startsWith(BUCKET_PREFIX)) return null
  const base = `/items/${item.id}`
  return {
    ...item,
    src: `${base}/model.glb`,
    thumbnail: files.includes('thumbnail.webp') ? `${base}/thumbnail.webp` : undefined,
    floorPlanUrl: files.includes('floor-plan.svg') ? `${base}/floor-plan.svg` : undefined,
  }
}
