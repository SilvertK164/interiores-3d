import { CabinetModuleNode, CabinetNode } from '@pascal-app/core/schema'
import { describe, expect, it } from 'vitest'
import {
  type PropTarget,
  canDuplicate,
  deleteWarning,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { CABINET_LIMITS } from '../src/editor/shell/properties-cabinet'
import { values } from './support/properties'

const asTarget = (node: unknown, descendants = 0): PropTarget => ({ node: node as PropTarget['node'], hostLength: null, descendants })
const single = (extra: Record<string, unknown> = {}) => asTarget(CabinetNode.parse(extra))
const cabModule = (extra: Record<string, unknown> = {}) => asTarget(CabinetModuleNode.parse(extra))
const applied = (t: PropTarget, patch: Record<string, unknown> | null): PropTarget => ({ ...t, node: { ...t.node, ...patch } })

describe('gabinete', () => {
  it('un gabinete suelto muestra Ancho, Fondo y Alto del cuerpo en metros', () => {
    const t = single()
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([['width', 'Ancho'], ['depth', 'Fondo'], ['carcassHeight', 'Alto del cuerpo']])
    expect(values(t)).toEqual({ width: '0,50 m', depth: '0,60 m', carcassHeight: '0,80 m' })
    expect(titleFor(t)).toBe('Gabinete')
    expect(subtitleFor(t)).toBe('0,50 × 0,60 m')
  })

  it('una hilera con módulos solo muestra cuántos tiene: se edita cada módulo', () => {
    const run = single({ children: ['cabinet-module_a', 'cabinet-module_b'] })
    expect(fieldsFor(run)).toEqual([{ kind: 'readonly', id: 'modules', label: 'Módulos', value: '2' }])
    expect(subtitleFor(run)).toBe('2 módulos')
    expect(subtitleFor(single({ children: ['cabinet-module_a'] }))).toBe('1 módulo')
    for (const id of ['width', 'depth', 'carcassHeight']) expect(patchFor(run, id, '1'), id).toBeNull()
  })

  it('un módulo muestra los mismos tres campos y su propio título, también al borrarlo', () => {
    const t = cabModule()
    expect(fieldsFor(t).map((f) => f.id)).toEqual(['width', 'depth', 'carcassHeight'])
    expect(titleFor(t)).toBe('Módulo de gabinete')
    expect(deleteWarning({ ...t, descendants: 1 })).toBe('Este módulo de gabinete tiene 1 elemento que también se borrará.')
  })

  it('fuera de rango se ajusta al límite', () => {
    for (const t of [single(), cabModule()]) {
      expect(patchFor(t, 'width', '10')).toEqual({ width: 3 })
      expect(patchFor(t, 'width', '10 cm')).toEqual({ width: 0.3 })
      expect(patchFor(t, 'depth', '5')).toEqual({ depth: 1.2 })
      expect(patchFor(t, 'depth', '0')).toEqual({ depth: 0.3 })
      expect(patchFor(t, 'carcassHeight', '9')).toEqual({ carcassHeight: 2.4 })
      expect(patchFor(t, 'carcassHeight', '0')).toEqual({ carcassHeight: 0.4 })
    }
  })

  it('un valor igual al actual o que no es un número no cambia nada', () => {
    for (const t of [single(), cabModule()]) {
      for (const [id, raw] of [['width', '0,5'], ['depth', '60 cm'], ['carcassHeight', '0,80'], ['width', 'ancho'], ['otro', '1']]) {
        expect(patchFor(t, id as string, raw as string), `${id} ${raw}`).toBeNull()
      }
    }
  })

  it('el cambio aplicado al nodo se lee de vuelta, y el valor anterior se recupera (lo que hace Deshacer)', () => {
    const t = single()
    const wider = applied(t, patchFor(t, 'width', '1,2'))
    expect(values(wider).width).toBe('1,20 m')
    expect(values(applied(wider, { width: 0.5 })).width).toBe('0,50 m')
    expect(values(applied(t, patchFor(t, 'carcassHeight', '0,9'))).carcassHeight).toBe('0,90 m')
  })

  it('los límites son los del esquema real: el máximo se acepta y un paso más allá se rechaza', () => {
    for (const schema of [CabinetNode, CabinetModuleNode]) {
      for (const [key, [min, max]] of Object.entries(CABINET_LIMITS)) {
        expect(schema.safeParse({ [key]: min }).success, `${key} mínimo`).toBe(true)
        expect(schema.safeParse({ [key]: max }).success, `${key} máximo`).toBe(true)
        expect(schema.safeParse({ [key]: max + 0.001 }).success, `${key} sobre el máximo`).toBe(false)
      }
      expect(schema.safeParse({ depth: 0.299 }).success).toBe(false)
      expect(schema.safeParse({ carcassHeight: 0.399 }).success).toBe(false)
    }
  })

  it('un gabinete no se duplica desde el panel', () => {
    expect(canDuplicate(single())).toBe(false)
    expect(canDuplicate(cabModule())).toBe(false)
  })
})
