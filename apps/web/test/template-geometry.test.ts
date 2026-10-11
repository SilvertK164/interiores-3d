import { describe, expect, it } from 'vitest'
import { cabinetWidth, footprint, grid, perimeter, row, shelfRow } from '../src/lib/templates/geometry'

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

describe('footprint', () => {
  it('sin giro es un rectángulo centrado en el punto', () => {
    expect(footprint([5, 5], 2, 1)).toEqual([[4, 4.5], [6, 4.5], [6, 5.5], [4, 5.5]])
  })

  it('girado 90° intercambia ancho y fondo (el eje local x va a (cos, -sin), como en three.js)', () => {
    expect(footprint([5, 5], 2, 1, Math.PI / 2)).toEqual([[4.5, 6], [4.5, 4], [5.5, 4], [5.5, 6]])
  })
})

describe('shelfRow y cabinetWidth', () => {
  it('shelfRow reparte estantes iguales con ids numerados', () => {
    const shelves = shelfRow('gondola', { style: 'open-rack', width: 1.5, depth: 0.5, height: 1.8, rows: 5 }, [1, 2], [5, 2], 3, { rotY: 1.5 })
    expect(shelves.map((s) => s.id)).toEqual(['gondola-1', 'gondola-2', 'gondola-3'])
    expect(shelves.map((s) => s.at)).toEqual([[1, 2], [3, 2], [5, 2]])
    expect(shelves.every((s) => s.rotY === 1.5 && s.rows === 5)).toBe(true)
  })

  it('cabinetWidth suma el ancho de los módulos', () => {
    expect(cabinetWidth({ modules: [{ width: 1.2, stack: [] }, { width: 0.6, stack: [] }] })).toBeCloseTo(1.8)
  })
})
