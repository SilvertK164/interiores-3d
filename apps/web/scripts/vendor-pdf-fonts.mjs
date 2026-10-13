// Copia DM Sans (latin y latin-ext, pesos 400 y 700, woff) desde @fontsource/dm-sans a public/fonts/pdf/, con su licencia OFL
// y un FUENTES.txt con versión, origen y huella de cada archivo. Uso: pnpm --filter @interiores/web fonts:pdf
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
// Sin argumento usa node_modules/@fontsource/dm-sans; con una carpeta (un paquete ya descomprimido) usa esa.
const packageDir = process.argv[2] ?? join(root, 'node_modules/@fontsource/dm-sans')
const target = join(root, 'public/fonts/pdf')
const FILES = [
  ['dm-sans-latin-400-normal.woff', 'DMSans-latin-400.woff'],
  ['dm-sans-latin-700-normal.woff', 'DMSans-latin-700.woff'],
  ['dm-sans-latin-ext-400-normal.woff', 'DMSans-latin-ext-400.woff'],
  ['dm-sans-latin-ext-700-normal.woff', 'DMSans-latin-ext-700.woff'],
]

for (const required of [join(packageDir, 'package.json'), join(packageDir, 'LICENSE'), ...FILES.map(([from]) => join(packageDir, 'files', from))]) {
  if (!existsSync(required)) {
    console.error(`No encuentro ${required}. Pasa la carpeta del paquete como argumento (o instálalo) y mira node_modules/@fontsource/dm-sans/files para los nombres reales.`)
    process.exit(1)
  }
}
const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
mkdirSync(target, { recursive: true })
const lines = []
for (const [from, to] of FILES) {
  const source = join(packageDir, 'files', from)
  copyFileSync(source, join(target, to))
  const sha = createHash('sha256').update(readFileSync(source)).digest('hex')
  lines.push(`${to}  sha256 ${sha}  (origen: files/${from})`)
}
copyFileSync(join(packageDir, 'LICENSE'), join(target, 'OFL.txt'))
writeFileSync(
  join(target, 'FUENTES.txt'),
  [
    'DM Sans (Colophon Foundry y Google), licencia SIL Open Font License 1.1 (ver OFL.txt, que debe viajar con los archivos).',
    `Origen: paquete npm @fontsource/dm-sans versión ${version} (https://www.npmjs.com/package/@fontsource/dm-sans), carpeta files/.`,
    'Variantes: latin y latin-ext, pesos 400 y 700, formato woff.',
    'Generado por apps/web/scripts/vendor-pdf-fonts.mjs (pnpm --filter @interiores/web fonts:pdf). No editar a mano.',
    '',
    ...lines,
    '',
  ].join('\n'),
)
console.log(`DM Sans ${version} copiada a public/fonts/pdf (${FILES.length} archivos, OFL.txt y FUENTES.txt)`)
