import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import manifest from '../../src/editor/local-items.json' with { type: 'json' }

const source = readFileSync(
  fileURLToPath(new URL('../../node_modules/@pascal-app/editor/src/components/ui/item-catalog/catalog-items.tsx', import.meta.url)),
  'utf8',
)

/** Los mismos ítems con su nombre (en inglés) y medidas: sirve para comprobar que los nombres propios no son los de Pascal. */
export function availableAssets(): { id: string; name: string; dimensions: [number, number, number] }[] {
  const ids = availableAssetIds()
  return source.split('\n  {\n').flatMap((block) => {
    const id = /\bid: '([^']+)'/.exec(block)?.[1]
    const name = /\bname: '([^']+)'/.exec(block)?.[1]
    const dims = /dimensions: \[([^\]]+)\]/.exec(block)?.[1]?.split(',').map(Number)
    if (!(id && name && dims && dims.length === 3 && ids.has(id))) return []
    return [{ id, name, dimensions: dims as [number, number, number] }]
  })
}

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
