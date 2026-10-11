import kenney from './kenney-pieces.json'

export type CommerceAsset = {
  id: string
  category: 'furniture' | 'appliance'
  name: string
  tags: string[]
  src: string
  thumbnail: string
  dimensions: [number, number, number]
  offset: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

/** Piezas del catálogo de Pascal (ya locales) útiles para comercio; el gabinete paramétrico va primero. */
export const COMMERCE_PASCAL_IDS: readonly string[] = [
  'cabinet',
  'kitchen-counter',
  'kitchen',
  'stove',
  'hood',
  'fridge',
  'coffee-machine',
  'shelf',
  'bookshelf',
  'dresser',
  'coat-rack',
  'stool',
  'dining-table',
  'dining-chair',
  'coffee-table',
  'sofa',
  'office-table',
  'office-chair',
  'computer',
  'television',
  'picture',
  'round-mirror',
  'rectangular-carpet',
  'round-carpet',
  'indoor-plant',
  'small-indoor-plant',
  'floor-lamp',
  'ceiling-lamp',
  'trash-bin',
  'exit-sign',
  'smoke-detector',
  'electric-panel',
  'air-conditioning',
]

type KenneyPiece = (typeof kenney)[number]

export function kenneyAssets(pieces: readonly KenneyPiece[] = kenney): CommerceAsset[] {
  return pieces.map((p) => ({
    id: p.id,
    category: p.category as CommerceAsset['category'],
    name: p.name,
    tags: p.tags,
    src: `/items/${p.folder}/model.glb`,
    thumbnail: `/items/${p.folder}/thumbnail.png`,
    dimensions: p.dimensions as [number, number, number],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  }))
}

/** Pestaña Comercio: las piezas de Pascal elegidas (en ese orden) y después las de Kenney. */
export function buildCommerceItems<T extends { id: string }>(localized: readonly T[]): Array<T | CommerceAsset> {
  const byId = new Map(localized.map((i) => [i.id, i]))
  const fromPascal = COMMERCE_PASCAL_IDS.flatMap((id) => byId.get(id) ?? [])
  return [...fromPascal, ...kenneyAssets()]
}
