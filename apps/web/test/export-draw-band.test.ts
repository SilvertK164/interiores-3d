import { describe, expect, it } from 'vitest'
import { drawLegend, drawNorth, drawScaleBar, legendLabel } from '../src/lib/export/draw-band'
import type { LegendEntry, LegendView } from '../src/lib/export/legend'
import { mmToPt } from '../src/lib/export/sheet'
import { paletteFor } from '../src/lib/export/surface'
import type { Scale } from '../src/lib/export/types'
import { createRecorder } from './support/recording-surface'

type Recorder = ReturnType<typeof createRecorder>
const color = paletteFor('color')
const rects = (recorder: Recorder) => recorder.calls.filter((c) => c.op === 'rect')
const zone = (label: string, areaM2?: number): LegendEntry => ({ kind: 'zone', label, color: '#1F5FE0', areaM2 })
const LEGEND_BOX = { x: 85, y: 164, width: 92, height: 36 }

describe('norte', () => {
  it('es una "N" centrada y una flecha rellena que apunta arriba, dentro de su caja de 12 × 14 mm', () => {
    const recorder = createRecorder()
    drawNorth(recorder.surface, { x: 12, y: 164, width: 12, height: 14 }, color)
    const letter = recorder.texts.find((t) => t.value === 'N')
    expect(letter?.style).toMatchObject({ align: 'center', bold: true })
    expect(letter?.x).toBeCloseTo(mmToPt(18), 9)
    const arrow = recorder.calls.find((c) => c.op === 'polygon')
    expect(arrow?.args[1]).toBe('fill')
    const points = arrow?.args[0] as [number, number][]
    expect(points).toHaveLength(4)
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(mmToPt(12))
      expect(x).toBeLessThanOrEqual(mmToPt(24))
      expect(y).toBeGreaterThanOrEqual(mmToPt(164))
      expect(y).toBeLessThanOrEqual(mmToPt(178))
    }
    // La punta (el primer punto) es el más alto de la hoja: la flecha apunta arriba.
    expect(points[0]?.[1]).toBe(Math.min(...points.map(([, y]) => y)))
  })
})

describe('escala gráfica (criterio 6)', () => {
  const draw = (scale: Scale, width: number) => {
    const recorder = createRecorder()
    drawScaleBar(recorder.surface, { x: 28, y: 100, width, height: 14 }, scale, color)
    return recorder
  }
  const totalMm = (recorder: Recorder) => rects(recorder).reduce((sum, c) => sum + Number(c.args[2]), 0) / mmToPt(1)

  it('son 4 tramos alternados de 10 mm: la barra de 2 m mide 40,0 mm a 1:50 en la zona ancha', () => {
    const recorder = draw(50, 55)
    expect(rects(recorder)).toHaveLength(4)
    for (const rect of rects(recorder)) expect(Number(rect.args[2])).toBeCloseTo(mmToPt(10), 9)
    expect(totalMm(recorder)).toBeCloseTo(40, 9)
    const fills = recorder.calls.filter((c) => c.op === 'fillColor').map((c) => c.args[0])
    expect(fills.slice(0, 4)).toEqual(['#0B1F4D', '#ffffff', '#0B1F4D', '#ffffff'])
  })

  it('1:25 usa 1 m (40 mm) y 1:100 usa 5 m (50 mm) en la zona ancha', () => {
    expect(totalMm(draw(25, 55))).toBeCloseTo(40, 9)
    expect(totalMm(draw(100, 55))).toBeCloseTo(50, 9)
  })

  it('rotula 0, la mitad y el largo con su unidad, y "Escala 1:50" debajo', () => {
    const recorder = draw(50, 55)
    expect(recorder.texts.map((t) => t.value)).toEqual(['0', '1', '2 m', 'Escala 1:50'])
    expect(recorder.texts.find((t) => t.value === '2 m')?.x).toBeCloseTo(mmToPt(30 + 40), 9)
  })

  it('en la zona angosta (30 mm) y en la ancha la barra nunca pasa del borde de su caja', () => {
    for (const width of [55, 30]) {
      for (const scale of [25, 50, 100] as const) {
        const end = 28 + 2 + totalMm(draw(scale, width))
        expect(end, `1:${scale} en ${width} mm`).toBeLessThanOrEqual(28 + width - 3 + 1e-9)
      }
    }
    expect(totalMm(draw(100, 30))).toBeCloseTo(20, 9)
  })
})

describe('leyenda (spec 5.3)', () => {
  const draw = (view: LegendView) => {
    const recorder = createRecorder()
    drawLegend(recorder.surface, LEGEND_BOX, view, 2, 4, color)
    return recorder
  }
  const values = (recorder: Recorder) => recorder.texts.map((t) => t.value)

  it('lleva título, una muestra y una etiqueta por entrada, en columnas que se llenan de arriba abajo', () => {
    const recorder = draw({
      shown: [zone('Sala', 15.2), zone('Cocina', 8.4), { kind: 'material', label: 'Madera', color: '#C9A27A' }, zone('Baño', 3), zone('Dormitorio', 12)],
      more: 0,
    })
    for (const expected of ['Leyenda', 'Sala · 15,2 m²', 'Cocina · 8,4 m²', 'Piso: Madera', 'Baño · 3,0 m²', 'Dormitorio · 12,0 m²']) expect(values(recorder), expected).toContain(expected)
    expect(rects(recorder)).toHaveLength(5)
    for (const swatch of rects(recorder)) expect(Number(swatch.args[2])).toBeCloseTo(mmToPt(3.2), 9)
    expect(recorder.texts.find((t) => t.value.startsWith('Sala'))?.x).toBeCloseTo(mmToPt(85 + 6.2), 9)
    // La quinta entrada ya no cabe en la primera columna (4 filas): pasa a la segunda.
    expect(recorder.texts.find((t) => t.value.startsWith('Dormitorio'))?.x).toBeCloseTo(mmToPt(85 + 46 + 6.2), 9)
  })

  it('la última fila es "y 3 más" cuando no entran todos, en el último lugar', () => {
    const recorder = draw({ shown: Array.from({ length: 7 }, (_, i) => zone(`Ambiente ${i}`, 10)), more: 3 })
    const more = recorder.texts.find((t) => t.value === 'y 3 más')
    expect(more).toBeDefined()
    expect(more?.x).toBeCloseTo(mmToPt(85 + 46 + 2), 9)
    expect(more?.y).toBeCloseTo(mmToPt(164 + 2 + 5 + 3 * 6 + 4.2), 9)
    expect(rects(recorder)).toHaveLength(7)
  })

  it('sin ambientes dice "Sin ambientes dibujados" y no dibuja muestras ni "y N más"', () => {
    const recorder = draw({ shown: [], more: 0 })
    expect(values(recorder)).toEqual(['Leyenda', 'Sin ambientes dibujados'])
    expect(rects(recorder)).toHaveLength(0)
  })

  it('un nombre larguísimo se corta con "…" y cabe en su columna', () => {
    const recorder = draw({ shown: [zone('x'.repeat(80), 10)], more: 0 })
    const shown = recorder.texts.find((t) => t.value.endsWith('…'))
    expect(shown).toBeDefined()
    expect(recorder.widthOf(shown?.value ?? '', 6, false)).toBeLessThanOrEqual(mmToPt(46 - 8) + 1e-9)
  })

  it('legendLabel: ambiente con y sin superficie, y material con "Piso:"', () => {
    expect(legendLabel(zone('Sala', 15.2))).toBe('Sala · 15,2 m²')
    expect(legendLabel(zone('Sala'))).toBe('Sala')
    expect(legendLabel({ kind: 'material', label: 'Madera', color: '#C9A27A' })).toBe('Piso: Madera')
  })
})
