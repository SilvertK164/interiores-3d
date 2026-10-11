import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SCENE_MAX_BYTES, SceneEnvelopeSchema } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { TEMPLATE_DEFINITIONS } from '../src/lib/templates'

const file = (name: string) => fileURLToPath(new URL(`../public/templates/${name}`, import.meta.url))
const publicPath = (p: string) => fileURLToPath(new URL(`../public${p}`, import.meta.url))

describe.each(TEMPLATE_DEFINITIONS.map((d) => [d.id, d] as const))('plantilla %s (archivo generado)', (id, def) => {
  const text = existsSync(file(`${id}.json`)) ? readFileSync(file(`${id}.json`), 'utf8') : ''

  it('existen el JSON y la miniatura', () => {
    expect(text.length, `falta public/templates/${id}.json: corre pnpm --filter @interiores/web templates:build`).toBeGreaterThan(0)
    expect(existsSync(file(`${id}.svg`))).toBe(true)
  })

  it('es un SceneEnvelope válido que cabe en 5 MB', () => {
    const envelope = JSON.parse(text)
    expect(SceneEnvelopeSchema.safeParse(envelope).success).toBe(true)
    expect(text.length).toBeLessThan(SCENE_MAX_BYTES)
  })

  it('tiene los niveles, ambientes, aberturas, piezas y escaleras de su definición', () => {
    const nodes = Object.values(JSON.parse(text).graph.nodes) as { type: string }[]
    const count = (t: string) => nodes.filter((n) => n.type === t).length
    const rooms = def.levels.flatMap((l) => l.rooms)
    const openings = def.levels.flatMap((l) => l.openings)
    expect(count('level')).toBe(def.levels.length)
    expect(count('zone')).toBe(rooms.length)
    expect(count('slab')).toBe(rooms.length)
    expect(count('ceiling')).toBe(rooms.filter((r) => r.ceiling !== null).length)
    expect(count('wall')).toBe(def.levels.flatMap((l) => l.walls).length)
    expect(count('door')).toBe(openings.filter((o) => o.type === 'door').length)
    expect(count('window')).toBe(openings.filter((o) => o.type === 'window').length)
    expect(count('item')).toBe(def.levels.flatMap((l) => l.items).length)
    expect(count('stair')).toBe(def.levels.flatMap((l) => l.stairs ?? []).length)
    expect(count('shelf')).toBe(def.levels.flatMap((l) => l.shelves ?? []).length)
    const cabinets = def.levels.flatMap((l) => l.cabinets ?? [])
    expect(count('cabinet')).toBe(cabinets.length)
    expect(count('cabinet-module')).toBe(cabinets.reduce((n, c) => n + c.modules.length, 0))
  })

  it('todas las piezas apuntan a archivos locales que existen', () => {
    const nodes = Object.values(JSON.parse(text).graph.nodes) as { type: string; asset?: { src: string } }[]
    for (const n of nodes.filter((x) => x.type === 'item')) {
      expect(existsSync(publicPath((n.asset as { src: string }).src)), (n.asset as { src: string }).src).toBe(true)
    }
  })
})
