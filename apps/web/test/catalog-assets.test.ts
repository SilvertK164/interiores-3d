import { describe, expect, it } from 'vitest'
import { buildAssetMap, localizeCatalog } from '../src/editor/catalog-assets'

const BUCKET = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system'
const item = (id: string, folder = id) => ({
  id,
  category: 'furniture',
  name: id,
  src: `${BUCKET}/${folder}/model.glb`,
  thumbnail: `${BUCKET}/${folder}/thumbnail.png`,
  floorPlanUrl: `${BUCKET}/${folder}/floor-plan.png`,
  dimensions: [1, 1, 1],
})
const manifest = { sofa: ['model.glb', 'thumbnail.webp', 'floor-plan.png'], 'kitchen-cabinet': ['model.glb'] }

describe('localizeCatalog', () => {
  it('conserva solo las piezas con modelo local y reescribe sus rutas a /items/<carpeta>/', () => {
    const local = localizeCatalog([item('sofa'), item('cabinet', 'kitchen-cabinet'), item('subida-de-usuario')], manifest)
    expect(local.map((i) => i.id)).toEqual(['sofa', 'cabinet'])
    expect(local[0]).toMatchObject({ src: '/items/sofa/model.glb', thumbnail: '/items/sofa/thumbnail.webp', floorPlanUrl: '/items/sofa/floor-plan.png' })
  })

  it('con el manifiesto real del proyecto el sofá del catálogo oficial está disponible', () => {
    expect(localizeCatalog([item('sofa')]).map((i) => i.id)).toEqual(['sofa'])
  })
})

describe('buildAssetMap', () => {
  it('arma el mapa id -> pieza local que usa el constructor de escenas', () => {
    const assets = buildAssetMap([item('sofa'), item('cabinet', 'kitchen-cabinet'), item('subida-de-usuario')], manifest)
    expect([...assets.keys()]).toEqual(['sofa', 'cabinet'])
    expect(assets.get('cabinet')?.src).toBe('/items/kitchen-cabinet/model.glb')
    expect(assets.get('cabinet')?.thumbnail).toBeUndefined()
  })

  it('devuelve un mapa vacío si ninguna pieza tiene modelo local', () => {
    expect(buildAssetMap([item('fantasma')], manifest).size).toBe(0)
  })
})
