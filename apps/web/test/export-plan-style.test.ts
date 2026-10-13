import { describe, expect, it } from 'vitest'
import { type GeoLike, PAPER_WIDTH_PT, type StyleContext, isWhite, paperColor, safeText, styleGeometry } from '../src/lib/export/plan-style'

const PT_PER_M = 56.69 // 1:50
const paper = (nodeType: string | undefined, extra: Partial<StyleContext> = {}): StyleContext => ({ mode: 'paper', nodeType, ptPerUnit: PT_PER_M, ...extra })

const WALL: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 0.2], [0, 0.2]], fill: '#374151', stroke: '#1f2937', strokeWidth: 0.02, opacity: 0.92 }
const DOOR_ARC: GeoLike = { kind: 'path', d: 'M0 0', fill: 'none', stroke: '#2563eb', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke' }
const DOOR_LEAF: GeoLike = { kind: 'polygon', points: [[0, 0], [1, 0], [1, 0.05]], fill: '#ffffff', stroke: '#2563eb', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }
const DOOR_WEDGE: GeoLike = { kind: 'path', d: 'M0 0', fill: '#2563eb', fillOpacity: 0.12, stroke: 'none' }
const SLAB: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 4]], fill: '#cbd5e1', fillOpacity: 0.6, stroke: '#475569', strokeWidth: 0.03 }
const ZONE: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 4]], fill: '#3b82f6', fillOpacity: 0.04, stroke: '#3b82f6', strokeWidth: 0.02 }
const ZONE_LABEL: GeoLike = { kind: 'text', x: 1, y: 1, text: 'Sala', fontSize: 0.2, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 0.03, paintOrder: 'stroke', fontWeight: 500 }
const SOFA_IMAGE: GeoLike = { kind: 'image', url: '/items/sofa/floor-plan.png', center: [1, 1], width: 2, height: 1 }
const SOFA_OUTLINE: GeoLike = { kind: 'polygon', points: [[0, 0], [2, 0], [2, 1]], fill: '#94a3b8', fillOpacity: 0.2, stroke: '#475569', strokeWidth: 0.02 }

const widthPt = (g: GeoLike) => (g.vectorEffect === 'non-scaling-stroke' ? (g.strokeWidth ?? 0) : (g.strokeWidth ?? 0) * PT_PER_M)

function leaves(g: GeoLike | null): GeoLike[] {
  if (!g) return []
  return g.kind === 'group' ? (g.children ?? []).flatMap(leaves) : [g]
}

describe('modo Papel (criterio 9)', () => {
  it('el muro se rellena de negro y su contorno mide 0,7 pt, sin transparencia', () => {
    const out = styleGeometry(WALL, paper('wall'))
    expect(out).toMatchObject({ kind: 'polygon', fill: '#000000', stroke: '#000000' })
    expect(widthPt(out as GeoLike)).toBeCloseTo(PAPER_WIDTH_PT.wall, 9)
    expect(out?.opacity).toBeUndefined()
    expect(out?.points).toEqual(WALL.points)
  })

  it('las aberturas (puerta) quedan en trazo negro de 0,35 pt; el blanco del batiente se conserva y la cuña se vacía', () => {
    const arc = styleGeometry(DOOR_ARC, paper('door'))
    expect(arc).toMatchObject({ fill: 'none', stroke: '#000000', strokeWidth: 0.35, vectorEffect: 'non-scaling-stroke' })
    expect(styleGeometry(DOOR_LEAF, paper('door'))).toMatchObject({ fill: '#ffffff', stroke: '#000000' })
    expect(styleGeometry(DOOR_WEDGE, paper('door'))).toMatchObject({ fill: 'none', stroke: 'none' })
  })

  it('la losa pierde su relleno gris y conserva un contorno fino de 0,35 pt', () => {
    const out = styleGeometry(SLAB, paper('slab'))
    expect(out).toMatchObject({ fill: 'none', stroke: '#000000' })
    expect(out?.fillOpacity).toBeUndefined()
    expect(widthPt(out as GeoLike)).toBeCloseTo(PAPER_WIDTH_PT.opening, 9)
  })

  it('el ambiente no pinta tinte ni contorno (los muros ya lo marcan)', () => {
    expect(styleGeometry(ZONE, paper('zone'))).toMatchObject({ fill: 'none', stroke: 'none' })
  })

  it('los muebles pierden la imagen y dejan su huella en 0,25 pt', () => {
    expect(styleGeometry(SOFA_IMAGE, paper('item'))).toBeNull()
    const out = styleGeometry(SOFA_OUTLINE, paper('item'))
    expect(out).toMatchObject({ fill: 'none', stroke: '#000000' })
    expect(widthPt(out as GeoLike)).toBeCloseTo(PAPER_WIDTH_PT.light, 9)
  })

  it('un grupo conserva lo que se dibuja, descarta lo que no y desaparece si queda vacío', () => {
    const group: GeoLike = { kind: 'group', children: [SOFA_IMAGE, SOFA_OUTLINE], transform: { translate: [1, 2] } }
    const out = styleGeometry(group, paper('item'))
    expect(out?.kind).toBe('group')
    expect(out?.children).toHaveLength(1)
    expect(out?.transform).toEqual({ translate: [1, 2] })
    expect(styleGeometry({ kind: 'group', children: [SOFA_IMAGE] }, paper('item'))).toBeNull()
  })

  it('el texto es negro y sin halo (Papel no tiene color)', () => {
    const out = styleGeometry(ZONE_LABEL, paper('zone'))
    expect(out).toMatchObject({ kind: 'text', text: 'Sala', fill: '#000000', fontWeight: 500 })
    expect(out?.stroke).toBeUndefined()
    expect(out?.paintOrder).toBeUndefined()
  })

  it('una página entera de geometrías cumple los invariantes de Papel', () => {
    const cases: [GeoLike, string][] = [[WALL, 'wall'], [DOOR_ARC, 'door'], [DOOR_LEAF, 'door'], [DOOR_WEDGE, 'door'], [SLAB, 'slab'], [ZONE, 'zone'], [ZONE_LABEL, 'zone'], [SOFA_IMAGE, 'item'], [SOFA_OUTLINE, 'item']]
    for (const [geometry, nodeType] of cases) {
      for (const leaf of leaves(styleGeometry(geometry, paper(nodeType)))) {
        expect(leaf.kind, nodeType).not.toBe('image')
        if (leaf.kind === 'text') continue
        expect(['none', '#000000', '#ffffff'], `${nodeType} relleno`).toContain(leaf.fill)
        expect(['none', '#000000', '#ffffff'], `${nodeType} trazo`).toContain(leaf.stroke)
        if (leaf.fill === '#000000') expect(nodeType).toBe('wall')
        if (leaf.stroke !== 'none') expect(widthPt(leaf), `${nodeType} ancho`).toBeLessThanOrEqual(0.7 + 1e-9)
      }
    }
  })

  it('no modifica la geometría que recibe', () => {
    const before = structuredClone(WALL)
    styleGeometry(WALL, paper('wall'))
    expect(WALL).toEqual(before)
  })

  it('los trazos de las cotas y otros tipos que no se tocan pasan tal cual', () => {
    const dimension: GeoLike = { kind: 'dimension', from: [0, 0], to: [4, 0] }
    expect(styleGeometry(dimension, paper('wall'))).toBe(dimension)
  })
})

describe('texto del plano (Pascal lo dibuja con Helvetica: solo Latin-1)', () => {
  it('un carácter que la fuente estándar no tiene sale como "?" y lo demás no cambia', () => {
    const label = (text: string): GeoLike => ({ ...ZONE_LABEL, text })
    expect(styleGeometry(label('Łódź'), paper('zone'))?.text).toBe('?ód?')
    expect(styleGeometry(label('Cocina · Año — Ñandú'), paper('zone'))?.text).toBe('Cocina · Año — Ñandú')
    expect(styleGeometry(label('Salón 🏠'), paper('zone'))?.text).toBe('Salón ?')
    expect(safeText('Győr')).toBe('Gy?r')
  })
})

describe('paperColor (el filtro de colores del renderizador de Pascal en Papel)', () => {
  it('el blanco y casi blanco quedan blancos y todo lo demás, negro', () => {
    expect(paperColor('#ffffff')).toBe('#ffffff')
    expect(paperColor('#FFF')).toBe('#ffffff')
    expect(paperColor('#fafafa')).toBe('#ffffff')
    expect(paperColor('#334155')).toBe('#000000')
    expect(paperColor('#111827')).toBe('#000000')
    expect(paperColor('#cbd5e1')).toBe('#000000')
    expect(paperColor('rgb(1, 2, 3)')).toBe('#000000')
  })

  it('isWhite reconoce blanco y no confunde "none" ni vacío', () => {
    expect(isWhite('#ffffff')).toBe(true)
    expect(isWhite('white')).toBe(true)
    expect(isWhite('none')).toBe(false)
    expect(isWhite(undefined)).toBe(false)
  })
})
