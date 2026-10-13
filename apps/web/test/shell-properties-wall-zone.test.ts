import { DEFAULT_WALL_HEIGHT, DEFAULT_WALL_THICKNESS } from '@pascal-app/core/wall'
import { describe, expect, it } from 'vitest'
import {
  WALL_DEFAULTS,
  canDuplicate,
  duplicatePatch,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { target, values } from './support/properties'

const WALL = { type: 'wall', start: [0, 0], end: [4, 0] }
const ZONE = { type: 'zone', name: 'Sala de estar', polygon: [[0, 0], [4, 0], [4, 3], [0, 3]], color: '#3b82f6' }

describe('muro', () => {
  it('muestra Largo, Alto y Grosor en metros, con los valores por omisión de Pascal cuando el muro no los trae', () => {
    expect(fieldsFor(target(WALL)).map((f) => [f.id, f.label])).toEqual([['length', 'Largo'], ['height', 'Alto'], ['thickness', 'Grosor']])
    expect(values(target(WALL))).toEqual({ length: '4,00 m', height: '2,50 m', thickness: '0,10 m' })
    expect(values(target({ ...WALL, height: 3, thickness: 0.2 }))).toMatchObject({ height: '3,00 m', thickness: '0,20 m' })
  })

  it('los valores por omisión coinciden con los de Pascal', () => {
    expect(WALL_DEFAULTS).toEqual({ height: DEFAULT_WALL_HEIGHT, thickness: DEFAULT_WALL_THICKNESS })
  })

  it('cambiar el alto o el grosor devuelve solo ese campo; fuera de rango se ajusta al límite', () => {
    expect(patchFor(target(WALL), 'height', '3')).toEqual({ height: 3 })
    expect(patchFor(target(WALL), 'height', '10,5')).toEqual({ height: 10 })
    expect(patchFor(target(WALL), 'thickness', '2 cm')).toEqual({ thickness: 0.05 })
  })

  it('un valor igual al actual o que no es un número no cambia nada', () => {
    expect(patchFor(target(WALL), 'height', '2,5')).toBeNull()
    expect(patchFor(target(WALL), 'height', 'abc')).toBeNull()
    expect(patchFor(target(WALL), 'desconocido', '1')).toBeNull()
  })

  it('cambiar el largo mueve el extremo final sobre la misma recta', () => {
    expect(patchFor(target(WALL), 'length', '6')).toEqual({ end: [6, 0] })
    expect(patchFor(target({ type: 'wall', start: [0, 0], end: [3, 4] }), 'length', '10')).toEqual({ end: [6, 8] })
    expect(patchFor(target({ type: 'wall', start: [1, 1], end: [1, 1] }), 'length', '2')).toBeNull()
  })

  it('título, subtítulo y copia desplazada', () => {
    expect(titleFor(target(WALL))).toBe('Muro')
    expect(subtitleFor(target(WALL))).toBe('Largo 4,00 m')
    expect(duplicatePatch(target(WALL))).toEqual({ start: [0.5, 0.5], end: [4.5, 0.5] })
    expect(canDuplicate(target(WALL))).toBe(true)
  })
})

describe('ambiente', () => {
  it('muestra Nombre, Altura, Color y Superficie (solo lectura), con "Zone N" traducido', () => {
    const t = target(ZONE)
    expect(fieldsFor(t).map((f) => [f.id, f.kind])).toEqual([['name', 'text'], ['ceilingHeight', 'number'], ['color', 'swatch'], ['area', 'readonly']])
    expect(values(t)).toMatchObject({ name: 'Sala de estar', ceilingHeight: '2,70 m', area: '12,0 m²' })
    expect(titleFor(target({ ...ZONE, name: 'Zone 2' }))).toBe('Ambiente 2')
    expect(subtitleFor(t)).toBe('12,0 m²')
  })

  it('renombrar recorta los espacios y no admite un nombre vacío', () => {
    expect(patchFor(target(ZONE), 'name', '  Cocina  ')).toEqual({ name: 'Cocina' })
    expect(patchFor(target(ZONE), 'name', '   ')).toBeNull()
    expect(patchFor(target(ZONE), 'name', 'Sala de estar')).toBeNull()
  })

  it('la altura se ajusta al rango y el color solo cambia si es otro', () => {
    expect(patchFor(target(ZONE), 'ceilingHeight', '2,4')).toEqual({ ceilingHeight: 2.4 })
    expect(patchFor(target(ZONE), 'ceilingHeight', '0,5')).toEqual({ ceilingHeight: 1.8 })
    expect(patchFor(target(ZONE), 'color', '#22c55e')).toEqual({ color: '#22c55e' })
    expect(patchFor(target(ZONE), 'color', '#3b82f6')).toBeNull()
  })

  it('la copia se corre medio metro y se llama "(copia)"', () => {
    expect(duplicatePatch(target(ZONE))).toEqual({
      polygon: [[0.5, 0.5], [4.5, 0.5], [4.5, 3.5], [0.5, 3.5]],
      name: 'Sala de estar (copia)',
    })
  })
})
