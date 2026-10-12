// Convierte "Mad" y "ri" en Fraunces 700 (SOFT 100) a contornos y reserva la caja de la "o" para la ventana de Madori.
// Uso: pnpm --filter @interiores/web brand:build [ruta de fraunces-latin-full-normal.woff2]
//   (escribe src/lib/export/brand-paths.ts y public/brand/madori-logotipo.svg)
// Requiere `fontkit` 2.0.4 y `@fontsource-variable/fraunces` 5.3.0: no son dependencias del proyecto (el PDF dibuja los caminos ya
// generados), así que instálalos solo para regenerar el logotipo (o pasa la ruta de la fuente) y quítalos después.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BRAND, WINDOW } from '../src/lib/brand'

/** `fontkit` se carga al generar (no al importar este archivo): las pruebas solo usan `renderModule` y `renderSvg`. */
function openFont(file: string): FontLike {
  const fontkit = createRequire(import.meta.url)('fontkit') as { openSync(file: string): unknown }
  return fontkit.openSync(file) as FontLike
}

type Command = { command: 'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'bezierCurveTo' | 'closePath'; args: number[] }
type FontLike = {
  unitsPerEm: number
  getVariation(axes: Record<string, number>): FontLike
  layout(text: string): {
    glyphs: { path: { commands: Command[] } }[]
    positions: { xAdvance: number; xOffset: number; yOffset: number }[]
  }
}

export type Logo = {
  box: { minX: number; minY: number; width: number; height: number }
  letters: [string, string]
  window: { x: number; y: number; width: number; height: number }
}

export const FRAUNCES_FILE = 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2'
/** Los ejes del logotipo: 700, suavidad al máximo y el tamaño óptico de 150 px (el de la medición de `Logo.css`). */
const AXES = { wght: 700, SOFT: 100, opsz: 144, WONK: 0 }
/** Tracking de -0,02 em, en unidades de 1000 por em. */
const TRACKING = -20
/** Caja de la ventana medida contra la "o" real a 150 px (`Logo.css`): 0,5 em de ancho, 0,479 de alto y 0,014 por debajo de la línea de base. */
const SLOT = { width: 500, height: 479, below: 14, marginLeft: 8, marginRight: -10 }
const LETTER: Record<Command['command'], string> = { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' }

const round = (value: number) => Number(value.toFixed(1))
const fixed = (value: number) => Number(value.toFixed(4))

function runPath(font: FontLike, text: string, startX: number) {
  const unit = 1000 / font.unitsPerEm
  const run = font.layout(text)
  let x = startX
  let d = ''
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index]
    const originX = x + (position?.xOffset ?? 0) * unit
    const originY = (position?.yOffset ?? 0) * unit
    for (const { command, args } of glyph.path.commands) {
      const numbers: string[] = []
      for (let i = 0; i < args.length; i += 2) {
        const px = originX + (args[i] ?? 0) * unit
        const py = -((args[i + 1] ?? 0) * unit + originY)
        minX = Math.min(minX, px)
        maxX = Math.max(maxX, px)
        minY = Math.min(minY, py)
        maxY = Math.max(maxY, py)
        numbers.push(String(round(px)), String(round(py)))
      }
      d += `${LETTER[command]}${numbers.join(' ')}`
    }
    x += (position?.xAdvance ?? 0) * unit + TRACKING
  })
  return { d, end: x, minX, maxX, minY, maxY }
}

export function buildLogo(fontFile: string): Logo {
  const font = openFont(fontFile).getVariation(AXES)
  const first = runPath(font, 'Mad', 0)
  const slotX = first.end + SLOT.marginLeft
  const second = runPath(font, 'ri', slotX + SLOT.width + SLOT.marginRight)
  const windowTop = SLOT.below - SLOT.height
  const minX = Math.min(first.minX, slotX)
  const maxX = Math.max(second.maxX, slotX + SLOT.width)
  const minY = Math.min(first.minY, second.minY, windowTop)
  const maxY = Math.max(first.maxY, second.maxY, SLOT.below)
  return {
    box: { minX: round(minX), minY: round(minY), width: round(maxX - minX), height: round(maxY - minY) },
    letters: [first.d, second.d],
    window: { x: round(slotX), y: windowTop, width: SLOT.width, height: SLOT.height },
  }
}

export function renderModule(logo: Logo): string {
  return [
    '// GENERADO por apps/web/scripts/build-brand-paths.ts (pnpm --filter @interiores/web brand:build) desde Fraunces 700 (SOFT 100, opsz 144).',
    '// No editar a mano: lo vigila test/export-brand-paths.test.ts.',
    '// Unidades: 1000 = 1 em; y hacia abajo; la línea de base es y = 0. letters = "Mad" y "ri"; window = caja de la ventana (la "o").',
    `export const LOGO = ${JSON.stringify(logo, null, 2)} as const`,
    '',
  ].join('\n')
}

export function renderSvg(logo: Logo): string {
  const pad = 20
  const view = [logo.box.minX - pad, logo.box.minY - pad, logo.box.width + 2 * pad, logo.box.height + 2 * pad].map(round).join(' ')
  const { window: slot } = logo
  const paths = logo.letters.map((d) => `  <path d="${d}" fill="${BRAND.noche}"/>`).join('\n')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" role="img" aria-label="Madori">`,
    '  <title>Madori</title>',
    paths,
    `  <g transform="translate(${slot.x} ${slot.y}) scale(${fixed(slot.width / 64)} ${fixed(slot.height / 64)})">`,
    `    <path d="${WINDOW.frame}" fill="none" stroke="${BRAND.noche}" stroke-width="${WINDOW.strokeWidth}" stroke-linejoin="round"/>`,
    `    <circle cx="${WINDOW.sun.cx}" cy="${WINDOW.sun.cy}" r="${WINDOW.sun.r}" fill="${BRAND.sol}"/>`,
    '  </g>',
    '</svg>',
    '',
  ].join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd()
  const logo = buildLogo(process.argv[2] ?? join(root, FRAUNCES_FILE))
  const moduleFile = join(root, 'src/lib/export/brand-paths.ts')
  const svg = join(root, 'public/brand/madori-logotipo.svg')
  mkdirSync(dirname(svg), { recursive: true })
  writeFileSync(moduleFile, renderModule(logo))
  writeFileSync(svg, renderSvg(logo))
  console.log(`Logotipo generado: caja ${logo.box.width} × ${logo.box.height}, ventana en x=${logo.window.x}`)
}
