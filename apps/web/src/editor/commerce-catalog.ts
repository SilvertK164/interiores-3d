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

/** Pestaña Comercio: las piezas de Pascal elegidas, en ese orden (las que no existan localmente se omiten). */
export function buildCommerceItems<T extends { id: string }>(localized: readonly T[]): T[] {
  const byId = new Map(localized.map((i) => [i.id, i]))
  return COMMERCE_PASCAL_IDS.flatMap((id) => byId.get(id) ?? [])
}
