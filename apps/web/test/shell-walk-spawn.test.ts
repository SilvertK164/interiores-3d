import { describe, expect, it } from 'vitest'
import { pickSpawn } from '../src/editor/shell/walk-spawn'

const rect = (x0: number, z0: number, x1: number, z1: number): [number, number][] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
const L: [number, number][] = [[0, 0], [6, 0], [6, 1], [1, 1], [1, 6], [0, 6]]

describe('punto de partida de Recorrer', () => {
  it('sin ambientes no hay punto (Pascal usa la cámara)', () => {
    expect(pickSpawn([])).toBeNull()
    expect(pickSpawn([{ polygon: [[0, 0], [1, 0]] }])).toBeNull()
  })

  it('elige el ambiente más grande y se para en su centro', () => {
    const spawn = pickSpawn([{ polygon: rect(0, 0, 2, 2) }, { polygon: rect(10, 0, 18, 6) }])
    expect(spawn?.x).toBeCloseTo(14)
    expect(spawn?.z).toBeCloseTo(3)
  })

  it('en un ambiente en L el punto queda dentro del polígono, no en el vacío del centroide', () => {
    const spawn = pickSpawn([{ polygon: L }])
    expect(spawn).not.toBeNull()
    const { x, z } = spawn as { x: number; z: number }
    const inside = (x >= 0 && x <= 6 && z >= 0 && z <= 1) || (x >= 0 && x <= 1 && z >= 0 && z <= 6)
    expect(inside).toBe(true)
  })

  it('mira hacia un extremo lejano del ambiente (el mismo convenio de giro que usa Pascal)', () => {
    const spawn = pickSpawn([{ polygon: rect(0, 0, 10, 2) }])
    // Desde (5, 1) el vértice más lejano es (0, 0): dirección (-5, -1), yaw = atan2(5, 1).
    expect(spawn?.yaw).toBeCloseTo(Math.atan2(5, 1), 5)
  })
})
