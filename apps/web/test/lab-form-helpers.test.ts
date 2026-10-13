import { ProjectNameSchema } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { LabError } from '../src/lib/lab/lab-error'
import * as formHelpers from '../src/lib/lab/form-helpers'
import { labProjectName, parseKnownWidth } from '../src/lib/lab/form-helpers'

describe('parseKnownWidth', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['4', 4],
    ['4.5', 4.5],
    ['4,5', 4.5],
    [' 12,25 ', 12.25],
    ['100', 100],
  ])('"%s" -> %s', (text, expected) => {
    expect(parseKnownWidth(text)).toBe(expected)
  })

  it.each(['0', '-2', '101', 'abc', '4 metros', '4,5,6', 'NaN', 'Infinity'])('"%s" explica el rango válido', (text) => {
    expect(() => parseKnownWidth(text)).toThrow(LabError)
    expect(() => parseKnownWidth(text)).toThrow(/mayor que 0 y hasta 100 metros/)
  })
})

describe('el laboratorio ya no habla con TP3', () => {
  it('no queda nada de la dirección del servicio (ni su validación ni su clave de localStorage)', () => {
    expect(Object.keys(formHelpers).sort()).toEqual(['labProjectName', 'parseKnownWidth'])
  })
})

describe('labProjectName', () => {
  it('"Desde una foto · día/mes/año hora:minutos" con la hora local', () => {
    expect(labProjectName(new Date(2026, 9, 11, 15, 4))).toBe('Desde una foto · 11/10/2026 15:04')
  })

  it('sirve como nombre de proyecto (la API acepta hasta 80 caracteres)', () => {
    expect(ProjectNameSchema.safeParse(labProjectName(new Date(2026, 0, 2, 3, 4))).success).toBe(true)
  })

  it('admite un sufijo para distinguir pruebas', () => {
    expect(labProjectName(new Date(2026, 9, 11, 15, 4), 'prueba Loft')).toBe('Desde una foto · prueba Loft · 11/10/2026 15:04')
  })
})
