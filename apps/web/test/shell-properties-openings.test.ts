import { DoorNode, WindowNode } from '@pascal-app/core/schema'
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

type Node = PropTarget['node']
const doorAt = (x: number, extra: Record<string, unknown> = {}, hostLength: number | null = 4): PropTarget => ({
  node: DoorNode.parse({ position: [x, 1.05, 0], wallId: 'wall_1', parentId: 'wall_1', ...extra }) as unknown as Node,
  hostLength,
  descendants: 0,
})
const windowAt = (x: number, extra: Record<string, unknown> = {}, hostLength: number | null = 4): PropTarget => ({
  node: WindowNode.parse({ position: [x, 1.5, 0], wallId: 'wall_1', parentId: 'wall_1', ...extra }) as unknown as Node,
  hostLength,
  descendants: 0,
})
const optionsOf = (t: PropTarget, id: string) => {
  const field = fieldsFor(t).find((f) => f.id === id)
  return field && 'options' in field ? field.options.map((o) => [o.value, o.label, 'disabled' in o && o.disabled === true]) : []
}

describe('puerta', () => {
  it('muestra Tipo, Ancho, Alto, Hojas y Forma del hueco con los valores de la puerta', () => {
    const t = doorAt(1)
    expect(fieldsFor(t).map((f) => [f.id, f.label, f.kind])).toEqual([
      ['doorType', 'Tipo', 'select'],
      ['width', 'Ancho', 'number'],
      ['height', 'Alto', 'number'],
      ['leafCount', 'Hojas', 'readonly'],
      ['openingShape', 'Forma del hueco', 'select'],
    ])
    expect(values(t)).toEqual({ doorType: 'hinged', width: '0,90 m', height: '2,10 m', leafCount: '1', openingShape: 'rectangle' })
    expect(titleFor(t)).toBe('Puerta')
    expect(subtitleFor(t)).toBe('Batiente de 1 hoja')
    expect(subtitleFor(doorAt(1, { doorType: 'double', leafCount: 2 }))).toBe('Doble de 2 hojas')
  })

  it('ofrece tres tipos y muestra, deshabilitado, el que no se puede elegir', () => {
    expect(optionsOf(doorAt(1), 'doorType')).toEqual([['hinged', 'Batiente', false], ['double', 'Doble', false], ['french', 'Francesa', false]])
    expect(optionsOf(doorAt(1, { doorType: 'folding' }), 'doorType').at(-1)).toEqual(['folding', 'Plegable', true])
  })

  it('cambiar el tipo cambia las hojas; un tipo no ofrecido o el mismo no cambian nada', () => {
    expect(patchFor(doorAt(1), 'doorType', 'double')).toEqual({ doorType: 'double', leafCount: 2 })
    expect(patchFor(doorAt(1, { doorType: 'double', leafCount: 2 }), 'doorType', 'hinged')).toEqual({ doorType: 'hinged', leafCount: 1 })
    expect(patchFor(doorAt(1), 'doorType', 'hinged')).toBeNull()
    expect(patchFor(doorAt(1), 'doorType', 'folding')).toBeNull()
    expect(patchFor(doorAt(1), 'openingShape', 'arch')).toEqual({ openingShape: 'arch' })
  })

  it('cambiar el ancho a 1,00 m deja el nodo en 1 m y la puerta dentro de su muro', () => {
    expect(patchFor(doorAt(1), 'width', '1,00')).toEqual({ width: 1, position: [1, 1.05, 0] })
    expect(patchFor(doorAt(1, {}, 1.2), 'width', '1')).toEqual({ width: 1, position: [0.7, 1.05, 0] })
    expect(patchFor(doorAt(1, {}, 0.8), 'width', '1')).toEqual({ width: 1, position: [0.4, 1.05, 0] })
    expect(patchFor(doorAt(1), 'width', '10')).toEqual({ width: 3, position: [1.5, 1.05, 0] })
    expect(patchFor(doorAt(1), 'width', '0,2')).toEqual({ width: 0.5, position: [1, 1.05, 0] })
  })

  it('cambiar el alto mantiene la puerta apoyada en el piso (su centro es la mitad del alto)', () => {
    expect(patchFor(doorAt(1), 'height', '2,4')).toEqual({ height: 2.4, position: [1, 1.2, 0] })
    expect(patchFor(doorAt(1), 'height', '2,1')).toBeNull()
  })

  it('la copia va al lado: a la derecha si cabe, si no a la izquierda, y si no hay lugar no se ofrece', () => {
    expect(duplicatePatch(doorAt(1))).toEqual({ position: [2.05, 1.05, 0] })
    expect(duplicatePatch(doorAt(3.5))).toEqual({ position: [2.45, 1.05, 0] })
    expect(canDuplicate(doorAt(1, {}, 1.2))).toBe(false)
    expect(canDuplicate(doorAt(1, {}, null))).toBe(false)
  })
})

describe('ventana', () => {
  it('muestra Tipo, Ancho, Alto, Antepecho y Forma del hueco; el antepecho sale del centro y el alto', () => {
    const t = windowAt(2)
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([
      ['windowType', 'Tipo'],
      ['width', 'Ancho'],
      ['height', 'Alto'],
      ['sill', 'Antepecho'],
      ['openingShape', 'Forma del hueco'],
    ])
    expect(values(t)).toEqual({ windowType: 'fixed', width: '1,50 m', height: '1,50 m', sill: '0,75 m', openingShape: 'rectangle' })
    expect(titleFor(t)).toBe('Ventana')
    expect(subtitleFor(t)).toBe('Fija')
  })

  it('ofrece seis tipos y muestra deshabilitado el que no se puede elegir', () => {
    expect(optionsOf(windowAt(2), 'windowType').map((o) => o[1])).toEqual(['Fija', 'Corrediza', 'Batiente', 'Proyectante', 'Guillotina simple', 'Guillotina doble'])
    expect(optionsOf(windowAt(2, { windowType: 'bay' }), 'windowType').at(-1)).toEqual(['bay', 'En saliente', true])
    expect(patchFor(windowAt(2), 'windowType', 'sliding')).toEqual({ windowType: 'sliding' })
    expect(patchFor(windowAt(2), 'windowType', 'bay')).toBeNull()
  })

  it('cambiar el alto conserva el antepecho y cambiar el antepecho mueve la ventana', () => {
    expect(patchFor(windowAt(2), 'height', '1')).toEqual({ height: 1, position: [2, 1.25, 0] })
    expect(patchFor(windowAt(2), 'sill', '1')).toEqual({ position: [2, 1.75, 0] })
    expect(patchFor(windowAt(2), 'sill', '5')).toEqual({ position: [2, 3.25, 0] })
    expect(patchFor(windowAt(2), 'sill', '0,75')).toBeNull()
  })

  it('cambiar el ancho la mantiene dentro del muro', () => {
    expect(patchFor(windowAt(2, {}, 3), 'width', '2')).toEqual({ width: 2, position: [2, 1.5, 0] })
    expect(patchFor(windowAt(2.8, {}, 3), 'width', '2')).toEqual({ width: 2, position: [2, 1.5, 0] })
  })

  it('la copia va al lado sobre el mismo muro', () => {
    expect(duplicatePatch(windowAt(1))).toEqual({ position: [2.65, 1.5, 0] })
  })
})
