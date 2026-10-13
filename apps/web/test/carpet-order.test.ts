import { describe, expect, it } from 'vitest'
import { CARPET_ASSETS, carpetsFirst } from '../src/editor/carpet-order'

const isCarpet = (id: string) => id.startsWith('alfombra')

describe('alfombras debajo de los demás elementos', () => {
  it('pasa las alfombras al principio y deja el resto en su orden', () => {
    expect(carpetsFirst(['muro', 'mesa', 'alfombra-1', 'silla', 'alfombra-2'], isCarpet)).toEqual(['alfombra-1', 'alfombra-2', 'muro', 'mesa', 'silla'])
  })

  it('si ya están primero, no hay nada que cambiar', () => {
    expect(carpetsFirst(['alfombra-1', 'muro', 'mesa'], isCarpet)).toBeNull()
    expect(carpetsFirst([], isCarpet)).toBeNull()
    expect(carpetsFirst(['muro'], isCarpet)).toBeNull()
  })

  it('las alfombras del catálogo son la rectangular y la redonda', () => {
    expect([...CARPET_ASSETS].sort()).toEqual(['rectangular-carpet', 'round-carpet'])
  })
})
