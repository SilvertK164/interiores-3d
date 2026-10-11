import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COMMERCE_PASCAL_IDS, buildCommerceItems } from '../src/editor/commerce-catalog'
import { localizeCatalogItem } from '../src/editor/catalog'
import manifest from '../src/editor/local-items.json' with { type: 'json' }

const source = readFileSync(
  fileURLToPath(new URL('../node_modules/@pascal-app/editor/src/components/ui/item-catalog/catalog-items.tsx', import.meta.url)),
  'utf8',
)
const BUCKET = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system'
const officialIds = [...source.matchAll(/\n {4}id: '([^']+)'/g)].map((m) => m[1] as string)
const folderById = new Map<string, string>()
for (const block of source.split('\n  {\n')) {
  const id = /\bid: '([^']+)'/.exec(block)?.[1]
  const folder = /items\/system\/([^/']+)\/model\.glb/.exec(block)?.[1]
  if (id && folder) folderById.set(id, folder)
}
// Un "catálogo localizado" mínimo con los ítems oficiales que sí tienen modelo local.
const localized = officialIds.flatMap((id) => {
  const folder = folderById.get(id)
  if (!folder) return []
  return localizeCatalogItem({ id, src: `${BUCKET}/${folder}/model.glb` }, manifest) ?? []
})

describe('catálogo de comercio', () => {
  it('cada pieza de Pascal elegida existe en el catálogo oficial y tiene modelo local', () => {
    for (const id of COMMERCE_PASCAL_IDS) {
      expect(officialIds, id).toContain(id)
      expect(localized.map((i) => i.id), id).toContain(id)
    }
  })

  it('la pestaña Comercio tiene al menos 20 piezas de Pascal, sin ids repetidos, y arranca con el gabinete paramétrico', () => {
    const items = buildCommerceItems(localized)
    const ids = items.map((i) => i.id)
    expect(items.length).toBeGreaterThanOrEqual(20)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe('cabinet')
    expect(ids.some((id) => id.startsWith('kenney-'))).toBe(false)
  })

  it('cada pieza de la pestaña trae un modelo local que existe', () => {
    for (const item of buildCommerceItems(localized)) {
      expect(existsSync(fileURLToPath(new URL(`../public${item.src}`, import.meta.url))), item.src).toBe(true)
    }
  })
})
