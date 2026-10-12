import { describe, expect, it } from 'vitest'
import { refreshItemAssets } from '../src/editor/item-assets'

const manifest = {
  sofa: ['floor-plan.png', 'model.glb', 'thumbnail.webp'],
  'office-chair': ['floor-plan.png', 'model.glb', 'thumbnail.webp'],
  cactus: ['model.glb'],
  lamp: ['floor-plan.svg', 'model.glb', 'thumbnail.webp'],
}
const item = (id: string, asset: Record<string, unknown>) => ({ id: `item_${id}`, type: 'item', asset: { id, name: id, ...asset } })
const graph = (...nodes: ReturnType<typeof item>[]) => ({ nodes: Object.fromEntries(nodes.map((n) => [n.id, n])), rootNodeIds: [] as string[] })
const assetOf = (g: ReturnType<typeof graph>, id: string) => (g.nodes[`item_${id}`] as ReturnType<typeof item>).asset as Record<string, unknown>

describe('rutas de los muebles de proyectos ya guardados', () => {
  it('las rutas viejas (floor-plan.svg borrado) pasan a las actuales (floor-plan.png)', () => {
    const old = graph(item('sofa', { src: '/items/sofa/model.glb', thumbnail: '/items/sofa/thumbnail.webp', floorPlanUrl: '/items/sofa/floor-plan.svg' }))
    expect(assetOf(refreshItemAssets(old, manifest), 'sofa')).toMatchObject({
      src: '/items/sofa/model.glb',
      thumbnail: '/items/sofa/thumbnail.webp',
      floorPlanUrl: '/items/sofa/floor-plan.png',
    })
  })

  it('también arregla las rutas del bucket de Pascal y mantiene el resto del descriptor', () => {
    const bucket = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system/office-chair'
    const old = graph(item('office-chair', { src: `${bucket}/model.glb`, thumbnail: `${bucket}/thumbnail.png`, floorPlanUrl: `${bucket}/floor-plan.png`, dimensions: [1, 1, 1] }))
    expect(assetOf(refreshItemAssets(old, manifest), 'office-chair')).toMatchObject({ id: 'office-chair', src: '/items/office-chair/model.glb', floorPlanUrl: '/items/office-chair/floor-plan.png', dimensions: [1, 1, 1] })
  })

  it('usa el .svg de respaldo si no hay PNG y quita el campo si no hay ninguno', () => {
    const old = graph(item('lamp', { src: '/items/lamp/model.glb', floorPlanUrl: '/items/lamp/x.png' }), item('cactus', { src: '/items/cactus/model.glb', floorPlanUrl: '/items/cactus/floor-plan.svg', thumbnail: '/items/cactus/thumbnail.webp' }))
    const fixed = refreshItemAssets(old, manifest)
    expect(assetOf(fixed, 'lamp').floorPlanUrl).toBe('/items/lamp/floor-plan.svg')
    expect(assetOf(fixed, 'cactus')).not.toHaveProperty('floorPlanUrl')
    expect(assetOf(fixed, 'cactus')).not.toHaveProperty('thumbnail')
  })

  it('no cambia nada si ya está bien (idempotente: mismo objeto) ni toca ids desconocidos ni otros tipos', () => {
    const good = graph(item('sofa', { src: '/items/sofa/model.glb', thumbnail: '/items/sofa/thumbnail.webp', floorPlanUrl: '/items/sofa/floor-plan.png' }))
    expect(refreshItemAssets(good, manifest)).toBe(good)
    const other = graph(item('mio', { src: 'https://ejemplo.com/users/u/mio/model.glb', floorPlanUrl: '/items/mio/floor-plan.svg' }))
    expect(refreshItemAssets(other, manifest)).toBe(other)
    const wall = { nodes: { w: { id: 'w', type: 'wall', asset: { src: '/items/sofa/model.glb', floorPlanUrl: '/viejo.svg' } } }, rootNodeIds: [] as string[] }
    expect(refreshItemAssets(wall as never, manifest)).toBe(wall)
    const once = refreshItemAssets(graph(item('sofa', { src: '/items/sofa/model.glb', floorPlanUrl: '/items/sofa/floor-plan.svg' })), manifest)
    expect(refreshItemAssets(once, manifest)).toBe(once)
  })
})
