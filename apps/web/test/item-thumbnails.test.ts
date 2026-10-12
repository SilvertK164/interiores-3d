import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import manifest from '../src/editor/local-items.json'
import { webpHasAlpha } from './support/webp'

const ITEMS = fileURLToPath(new URL('../public/items', import.meta.url))
const IDS = readdirSync(ITEMS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
const thumbnail = (id: string) => join(ITEMS, id, 'thumbnail.webp')

describe('miniaturas de los muebles (D9, criterio 8)', () => {
  it('hay 144 muebles y cada carpeta tiene su miniatura', () => {
    expect(IDS.length).toBeGreaterThanOrEqual(144)
    expect(IDS.filter((id) => !existsSync(thumbnail(id)))).toEqual([])
  })

  it('todas son WebP con canal alfa: la imagen no trae el fondo negro adentro', () => {
    const sinAlfa = IDS.filter((id) => existsSync(thumbnail(id)) && !webpHasAlpha(readFileSync(thumbnail(id))))
    expect(sinAlfa, 'Miniaturas sin canal alfa: corre pnpm --filter @interiores/web items:thumbs').toEqual([])
  })

  it('local-items.json lista la miniatura de cada carpeta que la tiene (si no, el catálogo no la usa)', () => {
    const files = manifest as Record<string, string[]>
    const sinListar = IDS.filter((id) => existsSync(thumbnail(id)) && !files[id]?.includes('thumbnail.webp'))
    expect(sinListar).toEqual([])
  })
})
