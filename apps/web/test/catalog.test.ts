import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { localizeCatalogItem } from '../src/editor/catalog.js'
import manifest from '../src/editor/local-items.json' with { type: 'json' }

const BUCKET = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system'

const sofa = {
  id: 'sofa',
  category: 'furniture',
  name: 'Sofa',
  src: `${BUCKET}/sofa/model.glb`,
  thumbnail: `${BUCKET}/sofa/thumbnail.png`,
  floorPlanUrl: `${BUCKET}/sofa/floor-plan.png`,
  dimensions: [2, 1, 1] as [number, number, number],
}

const cactus = {
  ...sofa,
  id: 'cactus',
  src: `${BUCKET}/cactus/model.glb`,
  thumbnail: `${BUCKET}/cactus/thumbnail.png`,
  floorPlanUrl: `${BUCKET}/cactus/floor-plan.png`,
}

describe('localizeCatalogItem', () => {
  it('apunta modelo, miniatura y plano 2D a los archivos propios (el sofá trae su floor-plan.svg)', () => {
    const local = localizeCatalogItem(sofa, manifest)
    expect(local?.src).toBe('/items/sofa/model.glb')
    expect(local?.thumbnail).toBe('/items/sofa/thumbnail.webp')
    expect(local?.floorPlanUrl).toBe('/items/sofa/floor-plan.svg')
    expect(local?.dimensions).toEqual([2, 1, 1])
  })

  it('quita floorPlanUrl cuando no existe el archivo local (el cactus no lo trae)', () => {
    expect(localizeCatalogItem(cactus, manifest)?.floorPlanUrl).toBeUndefined()
  })

  it('descarta los ítems que no tienen modelo local', () => {
    expect(localizeCatalogItem({ ...sofa, id: 'ikea-kallax-1x4-moa2y49n' }, manifest)).toBeNull()
  })

  it('sin tocar los de otro origen', () => {
    const external = { ...sofa, src: 'https://ejemplo.com/otro.glb' }
    expect(localizeCatalogItem(external, manifest)).toBeNull()
  })
})

describe('catálogo de Pascal 1.0.3 vs. assets vendoreados', () => {
  const source = readFileSync(
    fileURLToPath(
      new URL('../node_modules/@pascal-app/editor/src/components/ui/item-catalog/catalog-items.tsx', import.meta.url),
    ),
    'utf8',
  )
  const ids = [...source.matchAll(/\n {4}id: '([^']+)'/g)].map((m) => m[1] as string)

  it('el catálogo oficial tiene 111 ítems', () => {
    expect(ids).toHaveLength(111)
  })

  it('exactamente 100 ítems tienen modelo y miniatura locales', () => {
    const local = ids.filter((id) => (manifest as Record<string, string[]>)[id]?.includes('model.glb'))
    expect(local).toHaveLength(100)
  })
})
