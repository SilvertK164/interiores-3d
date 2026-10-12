import { materialCategoryEs, materialNameEs } from '@/lib/material-es'

/** Un material de la biblioteca de Pascal con lo que necesita el panel. `surfaces` ausente = sirve en cualquier superficie. */
export type MaterialItemLike = {
  id: string
  label: string
  category: string
  surfaces?: readonly string[]
  thumbnail?: string
  color?: string
}

export type SurfaceTabId = 'floor' | 'wall' | 'furniture' | 'roof'
export type Swatch = { id: string; name: string; thumbnail?: string; color?: string; selected: boolean }

/** Pestañas del panel (el diseño 17 muestra Suelo y Muros): filtran por `surfaces` y arrancan en su categoría más usada. */
export const SURFACE_TABS: readonly { id: SurfaceTabId; label: string; category: string }[] = [
  { id: 'floor', label: 'Suelo', category: 'wood' },
  { id: 'wall', label: 'Muros', category: 'colors' },
  { id: 'furniture', label: 'Muebles', category: 'fabric' },
  { id: 'roof', label: 'Techo', category: 'roofing' },
]
export const DEFAULT_SURFACE: SurfaceTabId = 'floor'

/** Orden fijo de las categorías en las fichas (las que Pascal agregue más adelante van al final). */
const CATEGORY_ORDER = [
  'wood', 'stone', 'tile', 'brick', 'concrete', 'metal', 'fabric', 'leather',
  'roofing', 'ground', 'glass', 'wallpaper', 'plastic', 'carpet', 'colors', 'other',
]

/** Los materiales que sirven para esa superficie: los suyos y los lisos, que sirven para cualquiera. */
export function materialsFor(items: readonly MaterialItemLike[], tab: SurfaceTabId): MaterialItemLike[] {
  return items.filter((item) => !item.surfaces || item.surfaces.includes(tab))
}

export function categoriesFor(items: readonly MaterialItemLike[], tab: SurfaceTabId): { id: string; label: string }[] {
  const present = new Set(materialsFor(items, tab).map((item) => item.category))
  const known = CATEGORY_ORDER.filter((id) => present.has(id))
  const extra = [...present].filter((id) => !CATEGORY_ORDER.includes(id))
  return [...known, ...extra].map((id) => ({ id, label: materialCategoryEs(id) }))
}

/** La categoría a mostrar: la pedida si la superficie la tiene; si no, la de partida de la superficie; si no, la primera. */
export function resolveCategory(items: readonly MaterialItemLike[], tab: SurfaceTabId, wanted: string | null): string | null {
  const available = categoriesFor(items, tab).map((c) => c.id)
  const home = SURFACE_TABS.find((t) => t.id === tab)?.category
  for (const candidate of [wanted, home]) if (candidate && available.includes(candidate)) return candidate
  return available[0] ?? null
}

const byName = new Intl.Collator('es', { numeric: true })

export function swatchesFor(
  items: readonly MaterialItemLike[],
  tab: SurfaceTabId,
  category: string | null,
  selectedId: string | null,
): Swatch[] {
  const swatches = materialsFor(items, tab)
    .filter((item) => item.category === category)
    .map((item) => ({
      id: item.id,
      name: materialNameEs(item.id, item.label),
      thumbnail: item.thumbnail,
      color: item.color,
      selected: item.id === selectedId,
    }))
  // Los colores siguen el orden de Pascal (por tono); el resto, por nombre con los números en orden.
  return category === 'colors' ? swatches : swatches.sort((a, b) => byName.compare(a.name, b.name))
}
