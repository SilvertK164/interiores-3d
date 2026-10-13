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

  it('conserva la herramienta nativa y usa la carpeta del modelo (cabinet vive en kitchen-cabinet)', () => {
    const cabinet = {
      id: 'cabinet',
      tool: 'cabinet',
      category: 'furniture',
      name: 'Modular Cabinet',
      src: `${BUCKET}/kitchen-cabinet/model.glb`,
      thumbnail: `${BUCKET}/kitchen-cabinet/thumbnail.png`,
      dimensions: [1, 1, 1] as [number, number, number],
    }
    const local = localizeCatalogItem(cabinet, manifest)
    expect(local?.tool).toBe('cabinet')
    expect(local?.src).toBe('/items/kitchen-cabinet/model.glb')
    expect(local?.thumbnail).toBe('/items/kitchen-cabinet/thumbnail.webp')
  })

  it('descarta los ítems cuyo modelo no está en el bucket del sistema (subidas de usuario)', () => {
    const user = { ...sofa, id: 'dishwasher-movn72ls', src: `${BUCKET.replace('/system', '')}/users/user_x/dishwasher-movn72ls/models/m.glb` }
    expect(localizeCatalogItem(user, manifest)).toBeNull()
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

  it('101 de los 111 ítems tienen modelo local (se busca por la carpeta del src, no por el id)', () => {
    const folders = [...source.matchAll(/items\/system\/([^/']+)\/model\.glb/g)].map((m) => m[1] as string)
    const local = folders.filter((f) => (manifest as Record<string, string[]>)[f]?.includes('model.glb'))
    expect(folders).toHaveLength(101)
    expect(local).toHaveLength(101)
  })
})
