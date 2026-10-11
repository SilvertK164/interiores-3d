import { describe, expect, it } from 'vitest'
import { grid, perimeter, row } from '../src/lib/templates/geometry'

describe('perimeter', () => {
  it('devuelve los cuatro muros de un rectángulo, todos hacia +x o +z', () => {
    const walls = perimeter('p', 0, 0, 10, 6)
    expect(walls.map((w) => w.id)).toEqual(['p-n', 'p-e', 'p-s', 'p-w'])
    expect(walls.find((w) => w.id === 'p-s')).toMatchObject({ from: [0, 6], to: [10, 6] })
    expect(walls.every((w) => w.to[0] >= w.from[0] && w.to[1] >= w.from[1])).toBe(true)
  })
})

describe('row y grid', () => {
  it('row reparte las piezas en línea con los extremos incluidos', () => {
    expect(row('x', [0, 1], [4, 1], 3).map((i) => i.at)).toEqual([[0, 1], [2, 1], [4, 1]])
  })

  it('row con una sola pieza la deja en el origen y conserva giro y altura', () => {
    expect(row('x', [2, 2], [9, 9], 1, { rotY: 1.5, y: 0.78 })).toEqual([{ asset: 'x', at: [2, 2], rotY: 1.5, y: 0.78 }])
  })

  it('grid arma columnas × filas con el paso indicado', () => {
    const items = grid('m', [1, 1], 3, 2, [2, 3])
    expect(items).toHaveLength(6)
    expect(items.map((i) => i.at)).toEqual([[1, 1], [3, 1], [5, 1], [1, 4], [3, 4], [5, 4]])
  })
})
