import { describe, expect, it } from 'vitest'
import { type AssetLike, buildItemNode } from '../src/editor/templates/scene-builder'

// El mueble tal como llega del catálogo local de Pascal (rutas ya reescritas a /items/<carpeta>/).
const SOFA: AssetLike = {
  id: 'sofa',
  category: 'furniture',
  name: 'Sofa',
  thumbnail: '/items/sofa/thumbnail.webp',
  src: '/items/sofa/model.glb',
  dimensions: [2.06, 0.74, 1.01],
  offset: [0, 0.37, 0],
}

describe('buildItemNode (el nodo de un mueble, igual para las plantillas y para «Muebles desde una foto»)', () => {
  it('arma un nodo item en la planta, con su posición y su giro alrededor del eje vertical', () => {
    const node = buildItemNode(SOFA, { parentId: 'level_a', position: [1.5, 0, -2], rotY: -Math.PI / 2 })
    expect(node.type).toBe('item')
    expect(node.id).toMatch(/^item_/)
    expect(node.parentId).toBe('level_a')
    expect(node.position).toEqual([1.5, 0, -2])
    expect(node.rotation).toEqual([0, -Math.PI / 2, 0])
    expect(node.name).toBe('Sofa')
  })

  it('el mueble conserva su ruta local y sus medidas reales, y se completan los valores por defecto del esquema', () => {
    const { asset } = buildItemNode(SOFA, { parentId: 'level_a', position: [0, 0, 0] })
    expect(asset).toMatchObject({
      id: 'sofa',
      src: '/items/sofa/model.glb',
      thumbnail: '/items/sofa/thumbnail.webp',
      dimensions: [2.06, 0.74, 1.01],
      offset: [0, 0.37, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      tags: [],
      source: 'library',
    })
  })

  it('sin miniatura usa la de respaldo; sin giro, 0', () => {
    const { thumbnail: _omit, ...withoutThumbnail } = SOFA
    const node = buildItemNode(withoutThumbnail, { parentId: 'level_a', position: [0, 0, 0] })
    expect(node.asset.thumbnail).toBe('/icons/couch.webp')
    expect(node.rotation).toEqual([0, 0, 0])
  })

  it('con un id lo usa; sin id el esquema genera uno distinto cada vez', () => {
    expect(buildItemNode(SOFA, { id: 'item_fijo', parentId: 'level_a', position: [0, 0, 0] }).id).toBe('item_fijo')
    const a = buildItemNode(SOFA, { parentId: 'level_a', position: [0, 0, 0] })
    const b = buildItemNode(SOFA, { parentId: 'level_a', position: [0, 0, 0] })
    expect(a.id).not.toBe(b.id)
  })

  it('un mueble con una ruta que Pascal no acepta falla al armarlo (no se guarda una escena rota)', () => {
    expect(() => buildItemNode({ ...SOFA, src: 'javascript:alert(1)' }, { parentId: 'level_a', position: [0, 0, 0] })).toThrow()
  })
})
