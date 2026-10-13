import { ProjectNameSchema } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { LabError } from '../src/lib/lab/lab-error'
import { DEFAULT_SERVICE_URL, labProjectName, normalizeServiceUrl, parseKnownWidth, readSavedServiceUrl, saveServiceUrl } from '../src/lib/lab/form-helpers'

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

describe('normalizeServiceUrl', () => {
  it.each([
    ['http://localhost:8000', 'http://localhost:8000'],
    ['  http://localhost:8000/  ', 'http://localhost:8000'],
    ['https://tp3.example.com/api/', 'https://tp3.example.com/api'],
    ['http://127.0.0.1:8000?x=1#y', 'http://127.0.0.1:8000'],
  ])('"%s" -> "%s"', (raw, expected) => {
    expect(normalizeServiceUrl(raw)).toBe(expected)
  })

  it.each(['', 'localhost:8000', 'ftp://localhost', 'no es una dirección'])('"%s" no sirve', (raw) => {
    expect(() => normalizeServiceUrl(raw)).toThrow(LabError)
  })
})

describe('DEFAULT_SERVICE_URL', () => {
  it('es la dirección local de TP3 (la misma para la página del laboratorio y para «Muebles desde una foto») y pasa la validación', () => {
    expect(DEFAULT_SERVICE_URL).toBe('http://localhost:8000')
    expect(normalizeServiceUrl(DEFAULT_SERVICE_URL)).toBe(DEFAULT_SERVICE_URL)
  })
})

describe('labProjectName', () => {
  it('"Laboratorio · día/mes/año hora:minutos" con la hora local', () => {
    expect(labProjectName(new Date(2026, 9, 11, 15, 4))).toBe('Laboratorio · 11/10/2026 15:04')
  })

  it('sirve como nombre de proyecto (la API acepta hasta 80 caracteres)', () => {
    expect(ProjectNameSchema.safeParse(labProjectName(new Date(2026, 0, 2, 3, 4))).success).toBe(true)
  })

  it('admite un sufijo para distinguir pruebas', () => {
    expect(labProjectName(new Date(2026, 9, 11, 15, 4), 'prueba Loft')).toBe('Laboratorio · prueba Loft · 11/10/2026 15:04')
  })
})

describe('dirección recordada en el navegador', () => {
  const memory = () => {
    const data = new Map<string, string>()
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
  }
  const broken = {
    getItem: () => {
      throw new Error('bloqueado')
    },
    setItem: () => {
      throw new Error('bloqueado')
    },
  }

  it('devuelve lo guardado y null si no hay nada', () => {
    const storage = memory()
    expect(readSavedServiceUrl(storage)).toBeNull()
    saveServiceUrl('http://localhost:9000', storage)
    expect(readSavedServiceUrl(storage)).toBe('http://localhost:9000')
  })

  it('si el almacenamiento falla (ventana privada, datos bloqueados) no rompe la página', () => {
    expect(readSavedServiceUrl(broken)).toBeNull()
    expect(() => saveServiceUrl('http://localhost:9000', broken)).not.toThrow()
  })

  it('sin almacenamiento disponible tampoco rompe', () => {
    expect(readSavedServiceUrl(null)).toBeNull()
    expect(() => saveServiceUrl('http://localhost:9000', null)).not.toThrow()
  })
})
