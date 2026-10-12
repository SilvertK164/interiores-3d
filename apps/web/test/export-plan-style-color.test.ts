import { describe, expect, it } from 'vitest'
import { BRAND } from '../src/lib/brand'
import { type GeoLike, type StyleContext, styleGeometry } from '../src/lib/export/plan-style'

const PT_PER_M = 56.69 // 1:50
const color = (nodeType: string | undefined, extra: Partial<StyleContext> = {}): StyleContext => ({ mode: 'color', nodeType, ptPerUnit: PT_PER_M, ...extra })

const WALL: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 0.2], [0, 0.2]], fill: '#374151', stroke: '#1f2937', strokeWidth: 0.02, opacity: 0.92 }
const DOOR_ARC: GeoLike = { kind: 'path', d: 'M0 0', fill: 'none', stroke: '#2563eb', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke' }
const SLAB: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 4]], fill: '#cbd5e1', fillOpacity: 0.6, stroke: '#475569', strokeWidth: 0.03 }
const ZONE: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 4]], fill: '#3b82f6', fillOpacity: 0.04, stroke: '#3b82f6', strokeWidth: 0.02 }
const ZONE_LABEL: GeoLike = { kind: 'text', x: 1, y: 1, text: 'Sala', fontSize: 0.2, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 0.03, paintOrder: 'stroke', fontWeight: 500 }
const SOFA_IMAGE: GeoLike = { kind: 'image', url: '/items/sofa/floor-plan.png', center: [1, 1], width: 2, height: 1 }
const SOFA_OUTLINE: GeoLike = { kind: 'polygon', points: [[0, 0], [2, 0], [2, 1]], fill: '#94a3b8', fillOpacity: 0.2, stroke: '#475569', strokeWidth: 0.02 }

describe('modo Color (criterio 10)', () => {
  it('el ambiente se rellena con su color al 35 % y no lleva contorno', () => {
    const out = styleGeometry(ZONE, color('zone', { zoneColor: '#B97A00' }))
    expect(out).toMatchObject({ fill: '#B97A00', fillOpacity: 0.35, stroke: 'none' })
  })

  it('la losa se pinta con el color de su material al 55 %; sin material queda como la dibuja Pascal', () => {
    expect(styleGeometry(SLAB, color('slab', { floorColor: '#C9A27A' }))).toMatchObject({ fill: '#C9A27A', fillOpacity: 0.55 })
    expect(styleGeometry(SLAB, color('slab'))).toBe(SLAB)
  })

  it('las imágenes de los muebles, los muros y los trazos de las aberturas se conservan', () => {
    expect(styleGeometry(SOFA_IMAGE, color('item'))).toBe(SOFA_IMAGE)
    expect(styleGeometry(WALL, color('wall'))).toBe(WALL)
    expect(styleGeometry(DOOR_ARC, color('door'))).toBe(DOOR_ARC)
  })

  it('el texto va en Noche con halo blanco', () => {
    const out = styleGeometry(ZONE_LABEL, color('zone'))
    expect(out).toMatchObject({ fill: BRAND.noche, stroke: '#ffffff', paintOrder: 'stroke', text: 'Sala' })
  })

  it('el texto con caracteres que Helvetica no tiene también sale con "?" en Color', () => {
    expect(styleGeometry({ ...ZONE_LABEL, text: 'Łódź' }, color('zone'))?.text).toBe('?ód?')
  })

  it('un grupo se recorre y se conserva aunque tenga imágenes', () => {
    const group: GeoLike = { kind: 'group', children: [SOFA_IMAGE, SOFA_OUTLINE] }
    expect(styleGeometry(group, color('item'))?.children).toHaveLength(2)
  })
})
