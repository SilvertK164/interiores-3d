// Copia pdf.js (build minificada: biblioteca y trabajador) desde pdfjs-dist a public/pdfjs/, con su licencia Apache-2.0 y un
// FUENTES.txt con versión, origen y huella de cada archivo. La vista previa de "Exportar plano" los carga con import() solo al
// abrir el diálogo (no entran en el paquete inicial).
// Uso: pnpm --filter @interiores/web pdfjs:vendor [carpeta de pdfjs-dist ya descomprimido]
// Sin argumento usa node_modules/pdfjs-dist; con una carpeta (npm pack pdfjs-dist@6.4.299) usa esa.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const packageDir = process.argv[2] ?? join(root, 'node_modules/pdfjs-dist')
const target = join(root, 'public/pdfjs')
const FILES = ['pdf.min.mjs', 'pdf.worker.min.mjs']

for (const required of [join(packageDir, 'package.json'), join(packageDir, 'LICENSE'), ...FILES.map((file) => join(packageDir, 'build', file))]) {
  if (!existsSync(required)) {
    console.error(`No encuentro ${required}. Pasa la carpeta del paquete como argumento (o instálalo) y mira build/ para los nombres reales.`)
    process.exit(1)
  }
}
const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
mkdirSync(target, { recursive: true })
const lines = FILES.map((file) => {
  copyFileSync(join(packageDir, 'build', file), join(target, file))
  const sha = createHash('sha256').update(readFileSync(join(packageDir, 'build', file))).digest('hex')
  return `${file}  sha256 ${sha}  (origen: build/${file})`
})
copyFileSync(join(packageDir, 'LICENSE'), join(target, 'LICENSE.txt'))
writeFileSync(
  join(target, 'FUENTES.txt'),
  [
    'PDF.js (Mozilla), licencia Apache-2.0 (ver LICENSE.txt, que debe viajar con los archivos).',
    `Origen: paquete npm pdfjs-dist versión ${version} (https://www.npmjs.com/package/pdfjs-dist), carpeta build/.`,
    'Se usa solo para dibujar la vista previa del diálogo "Exportar plano" (src/editor/shell/ui/render-pdf-page.ts).',
    'Generado por apps/web/scripts/vendor-pdfjs.mjs (pnpm --filter @interiores/web pdfjs:vendor). No editar a mano.',
    '',
    ...lines,
    '',
  ].join('\n'),
)
console.log(`pdf.js ${version} copiado a public/pdfjs (${FILES.length} archivos, LICENSE.txt y FUENTES.txt)`)
