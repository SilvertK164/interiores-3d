import { describe, expect, it } from 'vitest'
import { deepEqual } from '../src/editor/shell/equal'

describe('deepEqual', () => {
  it('compara por valor objetos, listas y primitivos', () => {
    expect(deepEqual({ a: 1, b: [1, { c: 'x' }] }, { a: 1, b: [1, { c: 'x' }] })).toBe(true)
    expect(deepEqual([1, 2], [1, 2])).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(NaN, NaN)).toBe(true)
  })

  it('distingue valores, largos, claves y listas de objetos', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(deepEqual([], {})).toBe(false)
    expect(deepEqual(null, {})).toBe(false)
  })
})
