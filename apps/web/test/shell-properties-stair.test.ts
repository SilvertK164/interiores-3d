import { StairNode, StairSegmentNode } from '@pascal-app/core/schema'
import { describe, expect, it } from 'vitest'
import {
  type PropTarget,
  canDuplicate,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { values } from './support/properties'

const asTarget = (node: unknown): PropTarget => ({ node: node as PropTarget['node'], hostLength: null, descendants: 0 })
const FLIGHT = StairSegmentNode.parse({})
const spiral = (extra: Record<string, unknown> = {}) => asTarget(StairNode.parse({ stairType: 'spiral', ...extra }))
const flight = (extra: Record<string, unknown> = {}) => asTarget(StairSegmentNode.parse(extra))
const applied = (t: PropTarget, patch: Record<string, unknown> | null): PropTarget => ({ ...t, node: { ...t.node, ...patch } })

describe('escalera curva y de caracol', () => {
  it('muestra Ancho y Escalones, y su tipo como subtítulo', () => {
    const t = spiral()
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([['width', 'Ancho'], ['stepCount', 'Escalones']])
    expect(values(t)).toEqual({ width: '1,00 m', stepCount: '10' })
    expect(titleFor(t)).toBe('Escalera')
    expect(subtitleFor(t)).toBe('Caracol')
    expect(subtitleFor(asTarget(StairNode.parse({ stairType: 'curved' })))).toBe('Curva')
  })

  it('fuera de rango se ajusta; igual al actual o no numérico no cambia nada', () => {
    const t = spiral()
    expect(patchFor(t, 'width', '20')).toEqual({ width: 10 })
    expect(patchFor(t, 'width', '0,1')).toEqual({ width: 0.4 })
    expect(patchFor(t, 'stepCount', '99')).toEqual({ stepCount: 32 })
    expect(patchFor(t, 'stepCount', '1')).toEqual({ stepCount: 2 })
    for (const [id, raw] of [['width', '1'], ['stepCount', '10'], ['stepCount', '10,5'], ['stepCount', 'diez'], ['width', 'ancho'], ['otro', '1']]) {
      expect(patchFor(t, id as string, raw as string), `${id} ${raw}`).toBeNull()
    }
  })

  it('el cambio aplicado al nodo se lee de vuelta, y el valor anterior se recupera (lo que hace Deshacer)', () => {
    const t = spiral()
    expect(values(applied(t, patchFor(t, 'width', '1,5'))).width).toBe('1,50 m')
    const more = applied(t, patchFor(t, 'stepCount', '14'))
    expect(values(more).stepCount).toBe('14')
    expect(values(applied(more, { stepCount: 10 })).stepCount).toBe('10')
  })
})

describe('escalera recta', () => {
  it('solo muestra cuántos tramos tiene y pide elegir un tramo', () => {
    const t = asTarget(StairNode.parse({ children: [FLIGHT.id] }))
    expect(fieldsFor(t)).toEqual([{ kind: 'readonly', id: 'tramos', label: 'Tramos', value: '1' }])
    expect(subtitleFor(t)).toBe('Elige un tramo para cambiar sus medidas')
    expect(patchFor(t, 'width', '2')).toBeNull()
  })
})

describe('tramo de escalera', () => {
  it('un tramo muestra Ancho y Escalones; un descanso, solo Ancho', () => {
    expect(fieldsFor(flight()).map((f) => [f.id, f.label])).toEqual([['width', 'Ancho'], ['stepCount', 'Escalones']])
    expect(values(flight())).toEqual({ width: '1,00 m', stepCount: '10' })
    expect(titleFor(flight())).toBe('Tramo de escalera')
    expect(subtitleFor(flight())).toBe('10 escalones')
    expect(fieldsFor(flight({ segmentType: 'landing' })).map((f) => f.id)).toEqual(['width'])
    expect(titleFor(flight({ segmentType: 'landing' }))).toBe('Descanso')
    expect(patchFor(flight({ segmentType: 'landing' }), 'stepCount', '5')).toBeNull()
  })

  it('fuera de rango se ajusta; el cambio se lee de vuelta', () => {
    const t = flight()
    expect(patchFor(t, 'width', '20')).toEqual({ width: 10 })
    expect(patchFor(t, 'width', '0,2')).toEqual({ width: 0.5 })
    expect(patchFor(t, 'stepCount', '99')).toEqual({ stepCount: 30 })
    expect(patchFor(t, 'stepCount', '0')).toEqual({ stepCount: 2 })
    expect(patchFor(t, 'stepCount', '10')).toBeNull()
    expect(values(applied(t, patchFor(t, 'width', '1,2'))).width).toBe('1,20 m')
  })

  it('ni la escalera ni el tramo se duplican desde el panel', () => {
    expect(canDuplicate(spiral())).toBe(false)
    expect(canDuplicate(flight())).toBe(false)
  })
})
