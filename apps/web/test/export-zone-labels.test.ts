import { describe, expect, it } from 'vitest'
import { areaLabel, polygonArea, polygonCentroid } from '../src/lib/export/zone-labels'

const ROOM = [[0, 0], [4, 0], [4, 3], [0, 3]] as const

describe('superficie y centro de un ambiente', () => {
  it('el área de un rectángulo de 4 × 3 m es 12 m², en cualquier sentido de giro', () => {
    expect(polygonArea(ROOM)).toBe(12)
    expect(polygonArea([...ROOM].reverse())).toBe(12)
  })

  it('el centro de un rectángulo es el centro, y el de una L cae dentro de la L', () => {
    expect(polygonCentroid(ROOM)).toEqual([2, 1.5])
    const l = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 3], [0, 3]] as const
    const [cx, cy] = polygonCentroid(l)
    expect(cx).toBeGreaterThan(0)
    expect(cy).toBeGreaterThan(0)
    expect(polygonArea(l)).toBe(6)
  })

  it('un polígono sin superficie tiene como centro el promedio de sus vértices', () => {
    expect(polygonCentroid([[0, 0], [2, 0], [4, 0]])).toEqual([2, 0])
    expect(polygonArea([[0, 0], [1, 0]])).toBe(0)
  })
})

describe('areaLabel', () => {
  it('es un texto "12,0 m²" centrado bajo el nombre del ambiente', () => {
    const label = areaLabel(ROOM)
    expect(label).toMatchObject({ kind: 'text', text: '12,0 m²', textAnchor: 'middle', x: 2 })
    expect(Number(label?.y)).toBeGreaterThan(1.5)
  })

  it('un ambiente degenerado (2 puntos o casi sin superficie) no lleva etiqueta', () => {
    expect(areaLabel([[0, 0], [1, 0]])).toBeNull()
    expect(areaLabel([[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]])).toBeNull()
  })

  it('el tamaño de la letra se puede cambiar', () => {
    expect(areaLabel(ROOM, { fontSizeM: 0.3 })?.fontSize).toBe(0.3)
  })
})
