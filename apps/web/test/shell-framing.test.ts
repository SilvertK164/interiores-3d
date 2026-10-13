import { describe, expect, it } from 'vitest'
import { fitCamera, fitPlan, frameMargin, insetsFrom } from '../src/editor/shell/framing'

const pane = { x: 0, y: 0, width: 640, height: 720 }

describe('márgenes que ocupan los paneles flotantes', () => {
  it('cada panel descuenta solo la parte que se mete en el lienzo, del lado que le toca', () => {
    const insets = insetsFrom(pane, [
      { side: 'left', rect: { x: 20, y: 88, width: 268, height: 250 } },
      { side: 'bottom', rect: { x: 330, y: 616, width: 620, height: 72 } },
      { side: 'top', rect: { x: 20, y: 20, width: 420, height: 56 } },
      { side: 'right', rect: { x: 900, y: 100, width: 300, height: 400 } }, // fuera del lienzo: no cuenta
    ])
    expect(insets).toEqual({ left: 288, right: 0, top: 76, bottom: 104 })
  })

  it('un panel que no toca el lienzo no descuenta nada', () => {
    expect(insetsFrom(pane, [{ side: 'left', rect: { x: -400, y: 0, width: 300, height: 500 } }])).toEqual({ left: 0, right: 0, top: 0, bottom: 0 })
  })
})

describe('encuadre del plano 2D', () => {
  const content = { minX: -6, minY: -3.5, maxX: 6, maxY: 3.5 }
  it('la planta completa cabe en la zona libre, con margen, y queda centrada en ella', () => {
    const insets = { left: 288, right: 0, top: 76, bottom: 104 }
    const view = fitPlan(content, { width: 640, height: 720 }, insets, 24)
    const s = view.width / 640 // unidades del plano por píxel
    // Zona libre en píxeles: x de 288 a 640, y de 76 a 616.
    const left = 640 / 2 + (content.minX - view.centerX) / s
    const right = 640 / 2 + (content.maxX - view.centerX) / s
    const top = 720 / 2 + (content.minY - view.centerY) / s
    const bottom = 720 / 2 + (content.maxY - view.centerY) / s
    expect(left).toBeGreaterThanOrEqual(288 + 12 - 0.01)
    expect(right).toBeLessThanOrEqual(640 - 24 + 0.01)
    expect(top).toBeGreaterThanOrEqual(76 + 12 - 0.01)
    expect(bottom).toBeLessThanOrEqual(616 - 12 + 0.01)
  })

  it('sin paneles la planta queda centrada y limitada por el lado más justo', () => {
    const view = fitPlan(content, { width: 1200, height: 600 }, { left: 0, right: 0, top: 0, bottom: 0 }, 0)
    expect(view.centerX).toBeCloseTo(0)
    expect(view.centerY).toBeCloseTo(0)
    expect(view.width / 1200).toBeCloseTo(7 / 600) // la altura (7 m) llena los 600 px
  })

  it('un lienzo casi tapado por los paneles no da un encuadre inválido', () => {
    const view = fitPlan(content, { width: 300, height: 300 }, { left: 280, right: 0, top: 0, bottom: 0 }, 24)
    expect(Number.isFinite(view.width) && view.width > 0).toBe(true)
  })
})

describe('la planta ocupa la mayor parte del panel', () => {
  const content = { minX: -6, minY: -3.5, maxX: 6, maxY: 3.5 }
  it('con margen del 8 % y sin paneles, la planta llena más del 80 % del lado que la limita', () => {
    const surface = { width: 960, height: 1080 }
    expect(frameMargin(surface)).toBe(77)
    const view = fitPlan(content, surface, { left: 0, right: 0, top: 0, bottom: 0 }, frameMargin(surface))
    expect(12 / view.width).toBeGreaterThan(0.8) // ancho de la planta / ancho visible
  })

  it('con el panel de plantas a la izquierda llena más del 60 % del ancho del lienzo', () => {
    const surface = { width: 960, height: 1080 }
    const view = fitPlan(content, surface, { left: 290, right: 0, top: 76, bottom: 104 }, frameMargin(surface))
    expect(12 / view.width).toBeGreaterThan(0.6)
  })
})

describe('encuadre de la cámara 3D', () => {
  const box = { center: [0, 1, 0] as [number, number, number], radius: 8 }
  const base = { canvas: { width: 640, height: 720 }, fov: 50, margin: 24 }

  it('la esfera de la planta cabe en la zona libre: más lejos cuanto menos espacio hay', () => {
    const free = fitCamera({ ...base, box, insets: { left: 0, right: 0, top: 0, bottom: 0 } })
    const tight = fitCamera({ ...base, box, insets: { left: 288, right: 0, top: 76, bottom: 104 } })
    const dist = (p: { position: number[]; target: number[] }) => Math.hypot(...p.position.map((v, i) => v - (p.target[i] ?? 0)))
    expect(dist(tight)).toBeGreaterThan(dist(free))
    expect(dist(free)).toBeGreaterThan(box.radius)
  })

  it('con un panel a la izquierda la mira se corre hacia la izquierda para que la planta quede a la derecha', () => {
    const none = fitCamera({ ...base, box, insets: { left: 0, right: 0, top: 0, bottom: 0 } })
    const left = fitCamera({ ...base, box, insets: { left: 300, right: 0, top: 0, bottom: 0 } })
    // La cámara mira en diagonal (+x, +z): "derecha" de la pantalla es (+x, -z); correr la mira a la izquierda baja x y sube z.
    expect(left.target[0]).toBeLessThan(none.target[0] ?? 0)
    expect(left.target[2]).toBeGreaterThan(none.target[2] ?? 0)
  })

  it('en ortográfica entrega el ancho visible que contiene la planta', () => {
    const pose = fitCamera({ ...base, box, insets: { left: 0, right: 0, top: 0, bottom: 0 } })
    expect(pose.viewWidth).toBeGreaterThan(box.radius * 2)
  })
})
