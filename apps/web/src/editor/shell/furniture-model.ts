import { CATALOG_CATEGORIES, categoryOf, nameEs } from '@/lib/catalog-es'
import { formatSize } from '@/lib/format'
import type { CatalogCard, CatalogChip } from './ui/FurnitureCatalog'

/** Lo que el panel necesita de un ítem del catálogo de Pascal (`CatalogItem`: `AssetInput` más `tool?`). */
export type CatalogItemLike = {
  id: string
  name: string
  thumbnail?: string
  /** Opcional en el tipo de Pascal (por defecto 1 × 1 × 1 m). */
  dimensions?: readonly [number, number, number]
  tool?: string
}

export const ALL_CHIP = 'todos'
export const COMMERCE_CHIP = 'comercio'

export const FURNITURE_CHIPS: readonly CatalogChip[] = [
  { id: ALL_CHIP, label: 'Todos' },
  ...CATALOG_CATEGORIES,
  { id: COMMERCE_CHIP, label: 'Comercio' },
]

/** Sin tildes ni mayúsculas: "sofa" encuentra "Sofá". */
export const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/**
 * Los ítems de la categoría elegida (Comercio es transversal: las piezas de `commerceIds`, de cualquier categoría) cuyo nombre
 * en castellano contiene la búsqueda, ordenados por ese nombre.
 */
export function filterFurniture(
  items: readonly CatalogItemLike[],
  filter: { query: string; chip: string },
  commerceIds: ReadonlySet<string>,
): CatalogItemLike[] {
  const query = normalize(filter.query)
  const inChip = (item: CatalogItemLike) =>
    filter.chip === ALL_CHIP ||
    (filter.chip === COMMERCE_CHIP ? commerceIds.has(item.id) : categoryOf(item.id) === filter.chip)
  return items
    .filter((item) => inChip(item) && (query === '' || normalize(nameEs(item.id, item.name)).includes(query)))
    .sort((a, b) => nameEs(a.id, a.name).localeCompare(nameEs(b.id, b.name), 'es'))
}

export function toCards(items: readonly CatalogItemLike[], selectedId: string | null): CatalogCard[] {
  return items.map((item) => ({
    id: item.id,
    name: nameEs(item.id, item.name),
    size: formatSize(item.dimensions?.[0] ?? 1, item.dimensions?.[2] ?? 1),
    thumbnail: item.thumbnail ?? '/icons/couch.webp',
    selected: item.id === selectedId,
  }))
}
