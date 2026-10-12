import { describe, expect, it } from 'vitest'
import { ALL_CHIP, COMMERCE_CHIP, FURNITURE_CHIPS, filterFurniture, normalize, toCards } from '../src/editor/shell/furniture-model'

const item = (id: string, name: string, dimensions: [number, number, number] = [1, 1, 1]) => ({ id, name, dimensions, thumbnail: `/items/${id}/thumbnail.webp` })
const ITEMS = [
  item('sofa', 'Sofa', [2.06, 0.74, 1.01]),
  item('bathtub', 'Bathtub'),
  item('stove', 'Stove'),
  item('tree', 'Tree'),
  item('double-bed', 'Double Bed'),
  item('single-bed', 'Single Bed'),
  item('guitar', 'Guitar'),
]
const COMMERCE = new Set(['sofa', 'stove'])
const ids = (list: readonly { id: string }[]) => list.map((i) => i.id)
const filter = (query: string, chip = ALL_CHIP) => ids(filterFurniture(ITEMS, { query, chip }, COMMERCE))

describe('chips', () => {
  it('son Todos, las seis categorías (con Baño) y Comercio, en castellano', () => {
    expect(FURNITURE_CHIPS.map((c) => c.label)).toEqual(['Todos', 'Estar', 'Dormitorio', 'Cocina', 'Baño', 'Exterior', 'Otros', 'Comercio'])
    expect(FURNITURE_CHIPS[0]?.id).toBe(ALL_CHIP)
    expect(FURNITURE_CHIPS.at(-1)?.id).toBe(COMMERCE_CHIP)
  })
})

describe('filterFurniture', () => {
  it('Todos lista todo ordenado por el nombre en castellano (Árbol antes que Bañera)', () => {
    expect(filter('')).toEqual(['tree', 'bathtub', 'double-bed', 'single-bed', 'stove', 'guitar', 'sofa'])
  })

  it('una categoría deja solo sus piezas', () => {
    expect(filter('', 'dormitorio')).toEqual(['double-bed', 'single-bed'])
    expect(filter('', 'bano')).toEqual(['bathtub'])
    expect(filter('', 'otros')).toEqual(['guitar'])
  })

  it('Comercio es transversal: deja las piezas de la lista de comercio sin importar su categoría', () => {
    expect(filter('', COMMERCE_CHIP)).toEqual(['stove', 'sofa'])
  })

  it('la búsqueda ignora tildes y mayúsculas y se combina con la categoría elegida', () => {
    expect(filter('sofa')).toEqual(['sofa'])
    expect(filter('SOFÁ')).toEqual(['sofa'])
    expect(filter('cama')).toEqual(['double-bed', 'single-bed'])
    expect(filter('cama', 'dormitorio')).toEqual(['double-bed', 'single-bed'])
    expect(filter('cama', 'exterior')).toEqual([])
    expect(filter('  bañera  ')).toEqual(['bathtub'])
    expect(filter('zzz')).toEqual([])
  })

  it('normalize quita tildes y diéresis', () => {
    expect(normalize('Árbol Cómoda ÑANDÚ')).toBe('arbol comoda nandu')
  })
})

describe('toCards', () => {
  it('arma tarjetas con nombre en castellano, ancho × fondo y la miniatura propia', () => {
    const [card] = toCards([ITEMS[0] as (typeof ITEMS)[number]], null)
    expect(card).toEqual({ id: 'sofa', name: 'Sofá', size: '2,06 × 1,01 m', thumbnail: '/items/sofa/thumbnail.webp', selected: false })
  })

  it('marca la tarjeta del mueble que se está colocando y usa un ícono si el ítem no trae miniatura ni medidas', () => {
    const cards = toCards([ITEMS[0] as (typeof ITEMS)[number], { id: 'nuevo', name: 'New' }], 'sofa')
    expect(cards.map((c) => c.selected)).toEqual([true, false])
    expect(cards[1]?.thumbnail).toBe('/icons/couch.webp')
    expect(cards[1]?.name).toBe('New')
    expect(cards[1]?.size).toBe('1,00 × 1,00 m')
  })
})
