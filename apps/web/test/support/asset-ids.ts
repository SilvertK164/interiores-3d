import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import manifest from '../../src/editor/local-items.json' with { type: 'json' }

const source = readFileSync(
  fileURLToPath(new URL('../../node_modules/@pascal-app/editor/src/components/ui/item-catalog/catalog-items.tsx', import.meta.url)),
  'utf8',
)

/** Ids de piezas que una plantilla puede usar: el catálogo oficial de Pascal con modelo local. */
export function availableAssetIds(): Set<string> {
  const ids = new Set<string>()
  for (const block of source.split('\n  {\n')) {
    const id = /\bid: '([^']+)'/.exec(block)?.[1]
    const folder = /items\/system\/([^/']+)\/model\.glb/.exec(block)?.[1]
    if (id && folder && (manifest as Record<string, string[]>)[folder]?.includes('model.glb')) ids.add(id)
  }
  return ids
}
