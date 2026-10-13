// Copia los assets estáticos y el catálogo local de muebles desde el repo MIT de Pascal.
// Uso: node scripts/vendor-pascal-assets.mjs                 (descarga y copia todo; las miniaturas vuelven a las de Pascal)
//      node scripts/vendor-pascal-assets.mjs --floor-plans   (solo baja las proyecciones en planta y regenera el manifiesto)
//      node scripts/vendor-pascal-assets.mjs --check         (solo verifica que estén)
// Además de lo del repo, baja la proyección en planta oficial de cada mueble (`floor-plan.png`, un PNG cenital en la orientación y la
// escala de Pascal): el repo no la trae, vive en el bucket público de Pascal junto al `model.glb` que citan sus entradas del catálogo.
// Lo que falte se reporta y el script termina con error (nunca en silencio).
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMMIT = '86f8e833904f7b6b3358bb1505feb82d801ad9ad'
const REPO = 'https://github.com/pascalorg/editor.git'
const BUCKET = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const manifestPath = join(root, 'src/editor/local-items.json')
// Carpetas con modelo pero sin `floor-plan.png` en el bucket: son modelos viejos que el catálogo de Pascal ya no ofrece (se reportan).
const withoutPlanPath = join(root, 'src/editor/no-floor-plan.json')
const REQUIRED = ['material', 'icons', 'hdri', 'fonts', 'audios', 'items/sofa/model.glb', 'pascal-LICENSE.txt']

if (process.argv.includes('--check')) {
  const missing = REQUIRED.filter((p) => !existsSync(join(pub, p)))
  if (missing.length > 0) {
    console.error(`Faltan assets de Pascal en public/: ${missing.join(', ')}. Ejecuta: pnpm --filter @interiores/web assets:vendor`)
    process.exit(1)
  }
  // Cada mueble local debe traer su proyección en planta.
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const known = existsSync(withoutPlanPath) ? JSON.parse(readFileSync(withoutPlanPath, 'utf8')) : []
    const without = Object.entries(manifest)
      .filter(([id, files]) => files.includes('model.glb') && !files.includes('floor-plan.png') && !known.includes(id))
      .map(([id]) => id)
    if (without.length > 0) {
      console.error(`Muebles sin floor-plan.png: ${without.join(', ')}. Ejecuta: pnpm --filter @interiores/web assets:vendor -- --floor-plans`)
      process.exit(1)
    }
  }
  process.exit(0)
}

/** Baja `floor-plan.png` de cada carpeta con modelo, de a 8; el PNG oficial reemplaza al .svg hecho a mano. Devuelve los que faltan. */
async function downloadFloorPlans() {
  const folders = readdirSync(join(pub, 'items')).filter((id) => existsSync(join(pub, 'items', id, 'model.glb')))
  const missing = []
  let bytes = 0
  const one = async (id) => {
    const response = await fetch(`${BUCKET}/${id}/floor-plan.png`)
    if (!response.ok) return void missing.push(`${id} (HTTP ${response.status})`)
    const data = Buffer.from(await response.arrayBuffer())
    writeFileSync(join(pub, 'items', id, 'floor-plan.png'), data)
    bytes += data.length
    rmSync(join(pub, 'items', id, 'floor-plan.svg'), { force: true })
  }
  for (let i = 0; i < folders.length; i += 8) {
    await Promise.all(folders.slice(i, i + 8).map((id) => one(id).catch((error) => missing.push(`${id} (${error.message})`))))
  }
  console.log(`Proyecciones en planta: ${folders.length - missing.length}/${folders.length} PNG, ${(bytes / 1024 / 1024).toFixed(2)} MB`)
  writeFileSync(withoutPlanPath, `${JSON.stringify(missing.map((entry) => entry.split(' ')[0]).sort(), null, 2)}
`)
  return missing
}

function writeManifest() {
  const manifest = {}
  for (const id of readdirSync(join(pub, 'items'))) manifest[id] = readdirSync(join(pub, 'items', id)).sort()
  mkdirSync(join(root, 'src/editor'), { recursive: true })
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return Object.keys(manifest).length
}

const report = (missing) => {
  if (missing.length === 0) return
  // Solo avisa: son modelos que ya no están en el catálogo de Pascal (la prueba de catálogo vigila que todo lo ofrecido tenga PNG).
  console.warn(`Sin floor-plan.png en el bucket (${missing.length}, guardados en src/editor/no-floor-plan.json): ${missing.join(', ')}`)
}

if (process.argv.includes('--floor-plans')) {
  const missing = await downloadFloorPlans()
  console.log(`Manifiesto regenerado: ${writeManifest()} muebles`)
  report(missing)
} else {
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

    const missing = await downloadFloorPlans()
    console.log(`Listo: ${writeManifest()} muebles locales de Pascal @ ${COMMIT.slice(0, 7)}`)
    console.log('Ojo: public/items/*/thumbnail.webp volvió a las miniaturas con fondo negro de Pascal. Corre: pnpm --filter @interiores/web items:thumbs')
    report(missing)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}
