import { ShelfNode } from '@pascal-app/core/schema'
import { describe, expect, it } from 'vitest'
import { countPatch, togglePatch } from '../src/editor/shell/properties-fields'
import {
  type PropTarget,
  canDuplicate,
  duplicatePatch,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { SHELF_LIMITS } from '../src/editor/shell/properties-parametric'
import { values } from './support/properties'

const shelfAt = (extra: Record<string, unknown> = {}): PropTarget => ({
  node: ShelfNode.parse({
    position: [1, 0, 1], style: 'bookshelf', width: 1, depth: 0.5, height: 1.8, rows: 3, columns: 2,
    withBack: true, withSides: true, withBottom: false, ...extra,
  }) as unknown as PropTarget['node'],
  hostLength: null,
  descendants: 0,
})
const ids = (t: PropTarget) => fieldsFor(t).map((f) => f.id)
/** Aplica el cambio al nodo como lo hace Pascal (une los campos) para volver a leerlo. */
const applied = (t: PropTarget, patch: Record<string, unknown> | null): PropTarget => ({ ...t, node: { ...t.node, ...patch } })

describe('estante', () => {
  it('una biblioteca muestra su estilo, las tres medidas en metros, filas, columnas y los tres interruptores', () => {
    const t = shelfAt()
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([
      ['style', 'Estilo'], ['width', 'Ancho'], ['depth', 'Fondo'], ['height', 'Alto'], ['rows', 'Filas'],
      ['columns', 'Columnas'], ['withSides', 'Paneles laterales'], ['withBack', 'Panel trasero'], ['withBottom', 'Tabla de base'],
    ])
    expect(values(t)).toEqual({
      style: 'bookshelf', width: '1,00 m', depth: '0,50 m', height: '1,80 m', rows: '3', columns: '2',
      withSides: 'yes', withBack: 'yes', withBottom: 'no',
    })
  })

  it('cada estilo muestra solo lo que le corresponde (como el inspector de Pascal)', () => {
    expect(ids(shelfAt({ style: 'wall-shelf' }))).toEqual(['style', 'width', 'depth', 'height', 'rows'])
    expect(ids(shelfAt({ style: 'open-rack' }))).toEqual(['style', 'width', 'depth', 'height', 'rows', 'withBack'])
    expect(ids(shelfAt({ style: 'cubby' }))).toEqual(['style', 'width', 'depth', 'height', 'rows', 'columns', 'withBottom'])
  })

  it('el estilo es una lista editable con los cuatro estilos en castellano y cambiarlo solo escribe el estilo', () => {
    const t = shelfAt()
    const style = fieldsFor(t).find((f) => f.id === 'style')
    expect(style).toMatchObject({ kind: 'select', value: 'bookshelf' })
    expect((style as { options: readonly { value: string; label: string }[] }).options).toEqual([
      { value: 'wall-shelf', label: 'Repisa de pared' },
      { value: 'bookshelf', label: 'Biblioteca' },
      { value: 'open-rack', label: 'Góndola' },
      { value: 'cubby', label: 'Cubículos' },
    ])
    expect(patchFor(t, 'style', 'cubby')).toEqual({ style: 'cubby' })
    expect(patchFor(t, 'style', 'bookshelf')).toBeNull()
    expect(patchFor(t, 'style', 'mesa')).toBeNull()
  })

  it('fuera de rango se ajusta al límite del esquema', () => {
    const t = shelfAt()
    expect(patchFor(t, 'width', '10')).toEqual({ width: 3 })
    expect(patchFor(t, 'width', '10 cm')).toEqual({ width: 0.3 })
    expect(patchFor(t, 'depth', '5')).toEqual({ depth: 1 })
    expect(patchFor(t, 'depth', '0')).toEqual({ depth: 0.1 })
    expect(patchFor(t, 'height', '9')).toEqual({ height: 2.5 })
    expect(patchFor(t, 'height', '0')).toEqual({ height: 0.05 })
    expect(patchFor(t, 'rows', '20')).toEqual({ rows: 8 })
    expect(patchFor(t, 'rows', '0')).toEqual({ rows: 1 })
    expect(patchFor(t, 'columns', '99')).toEqual({ columns: 6 })
  })

  it('un valor igual al actual, que no es un número o de un campo que el estilo no muestra no cambia nada', () => {
    const t = shelfAt()
    for (const [id, raw] of [['width', '1'], ['width', '1,0 m'], ['width', 'ancho'], ['rows', '3'], ['rows', '2,5'], ['rows', 'tres'], ['columns', '2'], ['otro', '1']]) {
      expect(patchFor(t, id as string, raw as string), `${id} ${raw}`).toBeNull()
    }
    expect(patchFor(shelfAt({ style: 'wall-shelf' }), 'columns', '3')).toBeNull()
    expect(patchFor(shelfAt({ style: 'open-rack' }), 'withSides', 'no')).toBeNull()
  })

  it('el cambio aplicado al nodo se lee de vuelta, y el valor anterior se recupera (lo que hace Deshacer)', () => {
    const t = shelfAt()
    expect(values(applied(t, patchFor(t, 'width', '2'))).width).toBe('2,00 m')
    expect(values(applied(t, patchFor(t, 'rows', '5'))).rows).toBe('5')
    const off = applied(t, patchFor(t, 'withBack', 'no'))
    expect(values(off).withBack).toBe('no')
    expect(patchFor(off, 'withBack', 'no')).toBeNull()
    expect(patchFor(off, 'withBack', 'yes')).toEqual({ withBack: true })
    expect(values(applied(off, { withBack: true })).withBack).toBe('yes')
  })

  it('los interruptores solo aceptan Sí o No y devuelven un booleano', () => {
    const t = shelfAt()
    expect(patchFor(t, 'withBottom', 'yes')).toEqual({ withBottom: true })
    expect(patchFor(t, 'withBack', 'yes')).toBeNull()
    expect(patchFor(t, 'withBack', 'tal vez')).toBeNull()
  })

  it('los límites son los del esquema real: dentro se acepta y un paso más allá se rechaza', () => {
    for (const [key, [min, max]] of Object.entries(SHELF_LIMITS)) {
      const eps = key === 'rows' || key === 'columns' ? 1 : 0.001
      expect(ShelfNode.safeParse({ [key]: min }).success, `${key} mínimo`).toBe(true)
      expect(ShelfNode.safeParse({ [key]: max }).success, `${key} máximo`).toBe(true)
      expect(ShelfNode.safeParse({ [key]: min - eps }).success, `${key} bajo el mínimo`).toBe(false)
      expect(ShelfNode.safeParse({ [key]: max + eps }).success, `${key} sobre el máximo`).toBe(false)
    }
  })

  it('título, subtítulo y copia desplazada', () => {
    expect(titleFor(shelfAt())).toBe('Biblioteca')
    expect(titleFor(shelfAt({ style: 'open-rack' }))).toBe('Góndola')
    expect(subtitleFor(shelfAt())).toBe('1,00 × 0,50 m')
    expect(duplicatePatch(shelfAt())).toEqual({ position: [1.5, 0, 1.5] })
    expect(canDuplicate(shelfAt())).toBe(true)
  })

  it('countPatch y togglePatch', () => {
    expect(countPatch('3', [1, 8], 2)).toBe(3)
    expect(countPatch(' 9 ', [1, 8], 2)).toBe(8)
    expect(countPatch('2', [1, 8], 2)).toBeNull()
    expect(countPatch('2,5', [1, 8], 2)).toBeNull()
    expect(countPatch('-1', [1, 8], 2)).toBeNull()
    expect(togglePatch('no', true)).toBe(false)
    expect(togglePatch('yes', true)).toBeNull()
    expect(togglePatch('x', true)).toBeNull()
  })
})
