import { ItemNode } from '@pascal-app/core/schema'
import { describe, expect, it } from 'vitest'
import {
  type PropTarget,
  canDuplicate,
  duplicatePatch,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { values } from './support/properties'

const SOFA = { id: 'sofa', category: 'furniture', name: 'Sofa', thumbnail: '/items/sofa/thumbnail.webp', src: '/items/sofa/model.glb', dimensions: [2.06, 0.74, 1.01] }
const itemAt = (extra: Record<string, unknown> = {}): PropTarget => ({
  node: ItemNode.parse({ position: [1, 0, 1], asset: SOFA, ...extra }) as unknown as PropTarget['node'],
  hostLength: null,
  descendants: 0,
})
const scaleOf = (patch: Record<string, unknown> | null) => (patch?.scale as number[] | undefined) ?? []

describe('mueble', () => {
  it('muestra Ancho, Alto, Profundidad y Giro; las medidas son las del modelo por su escala', () => {
    const t = itemAt()
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([
      ['width', 'Ancho'],
      ['height', 'Alto'],
      ['depth', 'Profundidad'],
      ['rotation', 'Giro'],
    ])
    expect(values(t)).toEqual({ width: '2,06 m', height: '0,74 m', depth: '1,01 m', rotation: '0°' })
    expect(values(itemAt({ scale: [0.5, 1, 2], rotation: [0, Math.PI / 2, 0] }))).toEqual({ width: '1,03 m', height: '0,74 m', depth: '2,02 m', rotation: '90°' })
  })

  it('el título es el nombre en castellano y el subtítulo, ancho × profundidad', () => {
    expect(titleFor(itemAt())).toBe('Sofá')
    expect(subtitleFor(itemAt())).toBe('2,06 × 1,01 m')
  })

  it('cambiar una medida cambia la escala de ese eje y deja las demás', () => {
    const [sx, sy, sz] = scaleOf(patchFor(itemAt(), 'width', '4'))
    expect((sx ?? 0) * 2.06).toBeCloseTo(4, 3)
    expect([sy, sz]).toEqual([1, 1])
    expect((scaleOf(patchFor(itemAt(), 'height', '1'))[1] ?? 0) * 0.74).toBeCloseTo(1, 3)
    expect((scaleOf(patchFor(itemAt(), 'depth', '50 cm'))[2] ?? 0) * 1.01).toBeCloseTo(0.5, 3)
  })

  it('fuera de rango se ajusta; igual al actual o no numérico no cambia nada', () => {
    expect((scaleOf(patchFor(itemAt(), 'width', '20'))[0] ?? 0) * 2.06).toBeCloseTo(10, 3)
    expect((scaleOf(patchFor(itemAt(), 'width', '0'))[0] ?? 0) * 2.06).toBeCloseTo(0.05, 3)
    expect(patchFor(itemAt(), 'width', '2,06')).toBeNull()
    expect(patchFor(itemAt(), 'width', 'ancho')).toBeNull()
  })

  it('el giro se escribe en grados, se guarda en radianes y se normaliza', () => {
    expect(patchFor(itemAt(), 'rotation', '90')).toEqual({ rotation: [0, 1.5708, 0] })
    expect(patchFor(itemAt(), 'rotation', '450°')).toEqual({ rotation: [0, 1.5708, 0] })
    expect(patchFor(itemAt(), 'rotation', '-90')).toEqual({ rotation: [0, 4.7124, 0] })
    expect(patchFor(itemAt(), 'rotation', '0')).toBeNull()
  })

  it('un mueble suelto se duplica medio metro más allá; uno pegado a un muro no se ofrece', () => {
    expect(duplicatePatch(itemAt())).toEqual({ position: [1.5, 0, 1.5] })
    expect(canDuplicate(itemAt())).toBe(true)
    expect(canDuplicate(itemAt({ wallId: 'wall_1' }))).toBe(false)
    expect(canDuplicate(itemAt({ roofSegmentId: 'roof-segment_1' }))).toBe(false)
  })
})
