import { describe, expect, it } from 'vitest'
import { THUMBNAIL_FOV, VIEW_DIRECTION, framePlacement } from '../src/editor/dev/thumbnail-camera'

type Vec3 = readonly [number, number, number]
const minus = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const length = (v: Vec3) => Math.hypot(v[0], v[1], v[2])
const CENTER: Vec3 = [0.2, 0.5, -0.1]

describe('framePlacement', () => {
  it('aleja la cámara lo justo para que la esfera del mueble quepa entera', () => {
    for (const radius of [0.03, 0.4, 1.5, 12]) {
      const { position } = framePlacement(CENTER, radius, THUMBNAIL_FOV)
      const distance = length(minus(position, CENTER))
      const visibleRadius = distance * Math.sin((THUMBNAIL_FOV * Math.PI) / 360)
      expect(visibleRadius).toBeGreaterThanOrEqual(radius)
      expect(visibleRadius).toBeLessThan(radius * 1.25) // con aire, pero sin dejar un mueble diminuto al centro
    }
  })

  it('siempre mira desde la misma dirección, sea cual sea el tamaño', () => {
    for (const radius of [0.1, 3]) {
      const offset = minus(framePlacement(CENTER, radius, THUMBNAIL_FOV).position, CENTER)
      for (const [i, n] of offset.entries()) expect(n / length(offset)).toBeCloseTo(VIEW_DIRECTION[i] ?? 0, 6)
    }
  })

  it('VIEW_DIRECTION es un vector unitario que mira de frente y desde arriba', () => {
    expect(length(VIEW_DIRECTION)).toBeCloseTo(1, 9)
    expect(VIEW_DIRECTION[1]).toBeGreaterThan(0)
    expect(VIEW_DIRECTION[2]).toBeGreaterThan(0)
  })

  it('deja el plano cercano delante del mueble y el lejano detrás', () => {
    const radius = 2
    const { position, near, far } = framePlacement(CENTER, radius, THUMBNAIL_FOV)
    const distance = length(minus(position, CENTER))
    expect(near).toBeGreaterThan(0)
    expect(near).toBeLessThan(distance - radius)
    expect(far).toBeGreaterThan(distance + radius)
  })

  it('un mueble del doble de tamaño se mira desde el doble de lejos', () => {
    const small = length(minus(framePlacement(CENTER, 0.5, THUMBNAIL_FOV).position, CENTER))
    const big = length(minus(framePlacement(CENTER, 1, THUMBNAIL_FOV).position, CENTER))
    expect(big / small).toBeCloseTo(2, 9)
  })
})
