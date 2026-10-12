import { describe, expect, it } from 'vitest'
import { cx } from '../src/lib/cx'

describe('cx', () => {
  it('une las clases y descarta falsos, nulos, indefinidos y vacíos', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b')
    expect(cx()).toBe('')
  })
})
