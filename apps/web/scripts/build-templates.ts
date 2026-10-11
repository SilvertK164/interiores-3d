// Genera public/templates/<id>.json (escena de Pascal) desde las definiciones. Las capturas .jpg salen de `templates:thumbs`.
//   tsx scripts/build-templates.ts           escribe los archivos
//   tsx scripts/build-templates.ts --check   falla si los archivos commiteados no coinciden con las definiciones
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PASCAL_CORE_VERSION, SCHEMA_VERSION } from '@interiores/contract'
import { CATALOG_ITEMS } from '../node_modules/@pascal-app/editor/src/components/ui/item-catalog/catalog-items'
import manifest from '../src/editor/local-items.json' with { type: 'json' }
import { localizeCatalogItem } from '../src/editor/catalog'
import { type AssetLike, buildScene } from '../src/editor/templates/scene-builder'
import { TEMPLATE_DEFINITIONS } from '../src/lib/templates'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/templates')
const check = process.argv.includes('--check')

const assets = new Map<string, AssetLike>()
for (const item of CATALOG_ITEMS) {
  const local = localizeCatalogItem(item as never, manifest as Record<string, string[]>) as AssetLike | null
  if (local) assets.set(local.id, local)
}

const stale: string[] = []
mkdirSync(outDir, { recursive: true })
for (const def of TEMPLATE_DEFINITIONS) {
  const envelope = { schemaVersion: SCHEMA_VERSION, pascal: { core: PASCAL_CORE_VERSION }, graph: buildScene(def, assets) }
  const files: [string, string][] = [
    [`${def.id}.json`, `${JSON.stringify(envelope, null, 1)}\n`],
  ]
  for (const [name, content] of files) {
    const path = join(outDir, name)
    if (check) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== content) stale.push(name)
    } else {
      writeFileSync(path, content)
    }
  }
}

if (check) {
  if (stale.length > 0) {
    console.error(`Plantillas desactualizadas: ${stale.join(', ')}. Ejecuta: pnpm --filter @interiores/web templates:build`)
    process.exit(1)
  }
  console.log('Plantillas al día.')
} else {
  console.log(`Listo: ${TEMPLATE_DEFINITIONS.length} plantillas en public/templates/`)
}
