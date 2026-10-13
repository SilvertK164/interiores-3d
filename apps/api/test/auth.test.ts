import { describe, expect, it } from 'vitest'
import { bearerToken } from '../src/auth.js'

describe('bearerToken', () => {
  it('extrae el token de un encabezado Bearer', () => {
    expect(bearerToken('Bearer abc.def')).toBe('abc.def')
    expect(bearerToken('bearer abc')).toBe('abc')
  })

  it('devuelve null con encabezados ausentes o mal formados', () => {
    expect(bearerToken(undefined)).toBeNull()
    expect(bearerToken('')).toBeNull()
    expect(bearerToken('Basic abc')).toBeNull()
    expect(bearerToken('Bearer')).toBeNull()
    expect(bearerToken('Bearer a b')).toBeNull()
  })
})
