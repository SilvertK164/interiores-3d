// Descarga Kenney Mini Market (CC0), verifica su SHA-256, copia 12 piezas a public/items/ y escribe el manifest.
//   tsx scripts/vendor-kenney-mini-market.ts            descarga y copia
//   tsx scripts/vendor-kenney-mini-market.ts --check    solo verifica que estén todos los archivos
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { glbBounds } from './lib/glb-bounds'

const ZIP_URL = 'https://kenney.nl/media/pages/assets/mini-market/463f38da51-1729865423/kenney_mini-market.zip'
const ZIP_SHA256 = '6f2e69090e359204ace43e4c98dc3fb8639b75e423109672b5c890d194c45203'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

type Piece = { file: string; name: string; category: 'furniture' | 'appliance'; tags: string[] }
const PIECES: Piece[] = [
  { file: 'cash-register', name: 'Caja registradora', category: 'appliance', tags: ['comercio', 'caja', 'mostrador'] },
  { file: 'freezer', name: 'Freezer horizontal', category: 'appliance', tags: ['comercio', 'freezer', 'heladera'] },
  { file: 'freezers-standing', name: 'Freezers verticales', category: 'appliance', tags: ['comercio', 'freezer', 'heladera'] },
  { file: 'shelf-bags', name: 'Góndola de bolsas', category: 'furniture', tags: ['comercio', 'góndola', 'estante'] },
  { file: 'shelf-boxes', name: 'Góndola de cajas', category: 'furniture', tags: ['comercio', 'góndola', 'estante'] },
  { file: 'shelf-end', name: 'Cabecera de góndola', category: 'furniture', tags: ['comercio', 'góndola', 'estante'] },
  { file: 'display-bread', name: 'Exhibidor de pan', category: 'furniture', tags: ['comercio', 'exhibidor', 'panadería'] },
  { file: 'display-fruit', name: 'Exhibidor de fruta', category: 'furniture', tags: ['comercio', 'exhibidor', 'verdulería'] },
  { file: 'shopping-cart', name: 'Carrito de compras', category: 'furniture', tags: ['comercio', 'carrito'] },
  { file: 'shopping-basket', name: 'Canasto', category: 'furniture', tags: ['comercio', 'canasto'] },
  { file: 'bottle-return', name: 'Retorno de botellas', category: 'appliance', tags: ['comercio', 'reciclaje'] },
  { file: 'character-employee', name: 'Vendedor', category: 'furniture', tags: ['comercio', 'persona', 'vendedor'] },
]

const folderOf = (piece: Piece) => `kenney-${piece.file}`
const itemsDir = join(root, 'public/items')
const manifestPath = join(root, 'src/editor/kenney-pieces.json')

if (process.argv.includes('--check')) {
  const missing = PIECES.flatMap((p) =>
    ['model.glb', 'thumbnail.png', 'Textures/colormap.png']
      .map((f) => `${folderOf(p)}/${f}`)
      .filter((f) => !existsSync(join(itemsDir, f))),
  )
  if (!existsSync(manifestPath)) missing.push('src/editor/kenney-pieces.json')
  if (missing.length > 0) {
    console.error(`Faltan archivos de Kenney: ${missing.join(', ')}. Ejecuta: pnpm --filter @interiores/web assets:kenney`)
    process.exit(1)
  }
  process.exit(0)
}

const response = await fetch(ZIP_URL)
if (!response.ok) throw new Error(`No se pudo descargar Kenney Mini Market: HTTP ${response.status}`)
const zipBytes = new Uint8Array(await response.arrayBuffer())
const sha = createHash('sha256').update(zipBytes).digest('hex')
if (sha !== ZIP_SHA256) throw new Error(`El ZIP de Kenney cambió (SHA-256 ${sha}); revisa la licencia y el contenido antes de actualizar el hash.`)

const files = unzipSync(zipBytes)
const need = (path: string): Uint8Array => {
  const data = files[path]
  if (!data) throw new Error(`El ZIP no trae ${path}`)
  return data
}

const manifest = PIECES.map((piece) => {
  const glb = need(`Models/GLB format/${piece.file}.glb`)
  const dir = join(itemsDir, folderOf(piece))
  mkdirSync(join(dir, 'Textures'), { recursive: true })
  writeFileSync(join(dir, 'model.glb'), glb)
  writeFileSync(join(dir, 'Textures/colormap.png'), need('Models/GLB format/Textures/colormap.png'))
  writeFileSync(join(dir, 'thumbnail.png'), need(`Previews/${piece.file}.png`))
  return {
    id: folderOf(piece),
    folder: folderOf(piece),
    name: piece.name,
    category: piece.category,
    tags: piece.tags,
    dimensions: glbBounds(glb).size,
  }
})

writeFileSync(join(itemsDir, 'kenney-LICENSE.txt'), Buffer.from(need('License.txt')))
mkdirSync(dirname(manifestPath), { recursive: true })
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Listo: ${manifest.length} piezas de Kenney Mini Market (CC0) en public/items/`)
