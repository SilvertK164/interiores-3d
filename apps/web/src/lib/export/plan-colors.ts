export const FALLBACK_FLOOR_COLOR = '#E3E6EA'

/** Un color por categoría de material de Pascal, para los materiales que solo tienen textura y no `previewColor`. */
export const CATEGORY_COLORS: Readonly<Record<string, string>> = {
  colors: '#E9E9E9',
  wood: '#C9A27A',
  stone: '#BDBDB8',
  brick: '#B5654A',
  tile: '#D7DEE6',
  wallpaper: '#E4DCCB',
  concrete: '#B8BBBE',
  metal: '#A8AEB5',
  plastic: '#DADDE2',
  fabric: '#D9CFC1',
  carpet: '#C9C2D6',
  leather: '#9C6B4E',
  roofing: '#A07060',
  ground: '#A9B58F',
  glass: '#CFE3EE',
  other: '#D9D9D9',
}

export type MaterialInfo = { label: string; category: string; previewColor?: string }
export type MaterialLookup = (id: string) => MaterialInfo | undefined
/** `color: null` = la losa no tiene material (se dibuja como Pascal); `label: null` = no va en la leyenda. */
export type FloorInfo = { color: string | null; label: string | null }

const LIBRARY_PREFIX = 'library:'
const HEX = /^#[0-9a-f]{3,8}$/i

/** El color y el nombre del material del piso de una losa. Un material de la biblioteca se escribe `library:<id>`. */
export function floorInfoOf(slab: { materialPreset?: string; material?: { color?: string } }, lookup: MaterialLookup): FloorInfo {
  const id = slab.materialPreset?.startsWith(LIBRARY_PREFIX) ? slab.materialPreset.slice(LIBRARY_PREFIX.length) : undefined
  const item = id ? lookup(id) : undefined
  const custom = slab.material?.color && HEX.test(slab.material.color) ? slab.material.color : null
  if (custom) return { color: custom, label: item?.label ?? null }
  if (!item) return { color: null, label: null }
  return { color: item.previewColor ?? CATEGORY_COLORS[item.category] ?? FALLBACK_FLOOR_COLOR, label: item.label }
}
