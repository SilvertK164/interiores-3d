// Copia los assets estáticos y el catálogo local de muebles desde el repo MIT de Pascal.
// Uso: node scripts/vendor-pascal-assets.mjs            (descarga y copia)
//      node scripts/vendor-pascal-assets.mjs --check    (solo verifica que estén)
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMMIT = '86f8e833904f7b6b3358bb1505feb82d801ad9ad'
const REPO = 'https://github.com/pascalorg/editor.git'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const REQUIRED = ['material', 'icons', 'hdri', 'fonts', 'audios', 'items/sofa/model.glb', 'pascal-LICENSE.txt']

if (process.argv.includes('--check')) {
  const missing = REQUIRED.filter((p) => !existsSync(join(pub, p)))
  if (missing.length > 0) {
    console.error(`Faltan assets de Pascal en public/: ${missing.join(', ')}. Ejecuta: pnpm --filter @interiores/web assets:vendor`)
    process.exit(1)
  }
  process.exit(0)
}

const tmp = mkdtempSync(join(tmpdir(), 'pascal-'))
try {
  const git = (...args) => execFileSync('git', args, { cwd: tmp, stdio: 'inherit' })
  git('init', '-q')
  git('remote', 'add', 'origin', REPO)
  git('fetch', '--depth', '1', 'origin', COMMIT)
  git('checkout', '-q', 'FETCH_HEAD')

  mkdirSync(pub, { recursive: true })
  for (const dir of ['material', 'icons', 'hdri', 'fonts', 'audios', 'items']) {
    cpSync(join(tmp, 'apps/editor/public', dir), join(pub, dir), { recursive: true })
  }
  cpSync(join(tmp, 'LICENSE'), join(pub, 'pascal-LICENSE.txt'))
  cpSync(join(tmp, 'styles/elevation.css'), join(root, 'app/elevation.css'))

  const manifest = {}
  for (const id of readdirSync(join(pub, 'items'))) {
    manifest[id] = readdirSync(join(pub, 'items', id)).sort()
  }
  mkdirSync(join(root, 'src/editor'), { recursive: true })
  writeFileSync(join(root, 'src/editor/local-items.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Listo: ${Object.keys(manifest).length} muebles locales de Pascal @ ${COMMIT.slice(0, 7)}`)
  console.log('Ojo: public/items/*/thumbnail.webp volvió a las miniaturas con fondo negro de Pascal. Corre: pnpm --filter @interiores/web items:thumbs')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
