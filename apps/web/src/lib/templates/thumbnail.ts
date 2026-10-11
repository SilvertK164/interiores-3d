import { cabinetWidth } from './geometry'
import type { TemplateDefinition } from './types'

const W = 240
const H = 160
const PAD = 12

/** Plano de la planta baja como SVG: ambientes de color, muros oscuros, huecos de puertas y ventanas y piezas. Los niveles de arriba van con línea punteada. */
export function renderTemplateThumbnail(def: TemplateDefinition): string {
  const ground = def.levels[0]!
  const xs = ground.walls.flatMap((w) => [w.from[0], w.to[0]])
  const zs = ground.walls.flatMap((w) => [w.from[1], w.to[1]])
  const minX = Math.min(...xs)
  const minZ = Math.min(...zs)
  const spanX = Math.max(...xs) - minX
  const spanZ = Math.max(...zs) - minZ
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanZ)
  const offX = (W - spanX * scale) / 2
  const offZ = (H - spanZ * scale) / 2
  const sx = (x: number) => (offX + (x - minX) * scale).toFixed(1)
  const sz = (z: number) => (offZ + (z - minZ) * scale).toFixed(1)
  const dim = (n: number) => (n * scale).toFixed(1)

  const rooms = ground.rooms
    .map((r) => `<rect x="${sx(r.rect[0])}" y="${sz(r.rect[1])}" width="${dim(r.rect[2] - r.rect[0])}" height="${dim(r.rect[3] - r.rect[1])}" fill="${r.color}" fill-opacity="0.18"/>`)
    .join('')
  const upper = def.levels
    .slice(1)
    .flatMap((l) => l.rooms)
    .map((r) => `<rect x="${sx(r.rect[0])}" y="${sz(r.rect[1])}" width="${dim(r.rect[2] - r.rect[0])}" height="${dim(r.rect[3] - r.rect[1])}" fill="none" stroke="#1F5FE0" stroke-width="1.2" stroke-dasharray="4 3"/>`)
    .join('')
  const walls = ground.walls
    .map((w) => `<line x1="${sx(w.from[0])}" y1="${sz(w.from[1])}" x2="${sx(w.to[0])}" y2="${sz(w.to[1])}" stroke="#2B3340" stroke-width="2.5" stroke-linecap="square"/>`)
    .join('')
  const gaps = ground.openings
    .map((o) => {
      const w = ground.walls.find((x) => x.id === o.wall)
      if (!w) return ''
      const len = Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1])
      const ux = (w.to[0] - w.from[0]) / len
      const uz = (w.to[1] - w.from[1]) / len
      const a = o.at - o.width / 2
      const b = o.at + o.width / 2
      return `<line x1="${sx(w.from[0] + ux * a)}" y1="${sz(w.from[1] + uz * a)}" x2="${sx(w.from[0] + ux * b)}" y2="${sz(w.from[1] + uz * b)}" stroke="${o.type === 'door' ? '#FFFFFF' : '#7FB2FF'}" stroke-width="3.2"/>`
    })
    .join('')
  const base = (kind: 'shelf' | 'cabinet', at: [number, number], width: number, depth: number, rotY = 0) =>
    `<rect data-kind="${kind}" x="${(Number(sx(at[0])) - (width * scale) / 2).toFixed(1)}" y="${(Number(sz(at[1])) - (depth * scale) / 2).toFixed(1)}" width="${dim(width)}" height="${dim(depth)}" rx="1" fill="#2B3340" fill-opacity="0.55" transform="rotate(${((-rotY * 180) / Math.PI).toFixed(1)} ${sx(at[0])} ${sz(at[1])})"/>`
  const furniture = [
    ...(ground.shelves ?? []).map((sh) => base('shelf', sh.at, sh.width, sh.depth, sh.rotY)),
    ...(ground.cabinets ?? []).map((c) => base('cabinet', c.at, cabinetWidth(c), c.depth, c.rotY)),
  ].join('')
  const items = ground.items.map((i) => `<circle cx="${sx(i.at[0])}" cy="${sz(i.at[1])}" r="1.6" fill="#1F5FE0"/>`).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#EEF2F8"/>${rooms}${upper}${furniture}${walls}${gaps}${items}</svg>\n`
}
