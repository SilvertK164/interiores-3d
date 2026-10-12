import { describe, expect, it } from 'vitest'
import {
  LIMITS,
  canDuplicate,
  deleteWarning,
  fieldsFor,
  metersPatch,
  parseDegrees,
  parseMeters,
  patchFor,
  titleFor,
  typeLabel,
} from '../src/editor/shell/properties-model'
import { target } from './support/properties'

const WALL = { type: 'wall' }

describe('parseMeters y parseDegrees', () => {
  it('entiende coma o punto, la unidad m o cm y los espacios; sin unidad son metros', () => {
    expect(parseMeters('1,25')).toBe(1.25)
    expect(parseMeters('1.25')).toBe(1.25)
    expect(parseMeters(' 0,9 m ')).toBe(0.9)
    expect(parseMeters('125 cm')).toBe(1.25)
    expect(parseMeters('90CM')).toBe(0.9)
    expect(parseMeters('2')).toBe(2)
  })

  it('devuelve null si no es un número', () => {
    for (const raw of ['', 'abc', '1,2,3', '1 metro', '-', 'm']) expect(parseMeters(raw), raw).toBeNull()
  })

  it('los grados se normalizan a [0, 360)', () => {
    expect(parseDegrees('90')).toBe(90)
    expect(parseDegrees('90°')).toBe(90)
    expect(parseDegrees('-90')).toBe(270)
    expect(parseDegrees('450')).toBe(90)
    expect(parseDegrees('12,5 grados')).toBe(12.5)
    expect(parseDegrees('x')).toBeNull()
  })
})

describe('metersPatch', () => {
  it('ajusta al rango, redondea al milímetro y devuelve solo lo que cambia', () => {
    expect(metersPatch('1,234567', [0.5, 3], 1)).toBe(1.235)
    expect(metersPatch('10', LIMITS.doorWidth, 0.9)).toBe(3)
    expect(metersPatch('0,1', LIMITS.doorWidth, 0.9)).toBe(0.5)
    expect(metersPatch('0,9', LIMITS.doorWidth, 0.9)).toBeNull()
  })

  it('lo que no es un número no cambia nada', () => {
    expect(metersPatch('abc', LIMITS.doorWidth, 0.9)).toBeNull()
  })
})

describe('tipos sin panel propio y aviso de borrado', () => {
  it('un piso o una escalera solo tienen el nombre del tipo: sin campos, sin Duplicar', () => {
    for (const [type, label] of [['slab', 'Piso'], ['stair', 'Escalera'], ['column', 'Columna'], ['raro', 'Elemento']] as const) {
      expect(typeLabel(type)).toBe(label)
      expect(titleFor(target({ type }))).toBe(label)
      expect(fieldsFor(target({ type }))).toEqual([])
      expect(patchFor(target({ type }), 'x', '1')).toBeNull()
      expect(canDuplicate(target({ type }))).toBe(false)
    }
  })

  it('borrar pide confirmación solo si hay cosas colgando, y lo dice con el género del elemento', () => {
    expect(deleteWarning(target(WALL))).toBeNull()
    expect(deleteWarning(target(WALL, { descendants: 2 }))).toBe('Este muro tiene 2 elementos que también se borrarán.')
    expect(deleteWarning(target({ type: 'stair' }, { descendants: 1 }))).toBe('Esta escalera tiene 1 elemento que también se borrará.')
  })
})
