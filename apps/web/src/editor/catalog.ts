const BUCKET_SYSTEM = /^https:\/\/byrpxoiotywskoojsrzd\.supabase\.co\/storage\/v1\/object\/public\/items\/system\/([^/]+)\//

export type LocalItemsManifest = Record<string, string[]>

type CatalogLike = { id: string; src: string; thumbnail?: string; floorPlanUrl?: string }

/**
 * Reescribe un ítem del catálogo de Pascal para servirlo desde `public/items/<carpeta>/`.
 * La carpeta sale del `src` (no del id: el gabinete `cabinet` usa la carpeta `kitchen-cabinet`).
 * Devuelve `null` si el modelo no está en el bucket del sistema o no existe localmente (subidas de usuario).
 */
export function localizeCatalogItem<T extends CatalogLike>(item: T, manifest: LocalItemsManifest): T | null {
  const folder = BUCKET_SYSTEM.exec(item.src)?.[1]
  const files = folder ? manifest[folder] : undefined
  if (!folder || !files?.includes('model.glb')) return null
  const base = `/items/${folder}`
  return {
    ...item,
    src: `${base}/model.glb`,
    thumbnail: files.includes('thumbnail.webp') ? `${base}/thumbnail.webp` : undefined,
    // La proyección en planta oficial de Pascal es un PNG cenital; el .svg es solo un respaldo hecho a mano.
    floorPlanUrl: files.includes('floor-plan.png') ? `${base}/floor-plan.png` : files.includes('floor-plan.svg') ? `${base}/floor-plan.svg` : undefined,
  }
}
