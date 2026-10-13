import { describe, expect, it } from 'vitest'
import { type BoxMm, sheetFor } from '../src/lib/export/sheet'
import { layoutBand, layoutBlock } from '../src/lib/export/title-block'

const SHEETS = [
  ['A4', 'landscape'],
  ['A3', 'landscape'],
  ['A4', 'portrait'],
  ['A3', 'portrait'],
] as const

const inside = (inner: BoxMm, outer: BoxMm) =>
  inner.x >= outer.x - 1e-9 &&
  inner.y >= outer.y - 1e-9 &&
  inner.x + inner.width <= outer.x + outer.width + 1e-9 &&
  inner.y + inner.height <= outer.y + outer.height + 1e-9
const overlap = (a: BoxMm, b: BoxMm) =>
  a.x < b.x + b.width - 1e-9 && b.x < a.x + a.width - 1e-9 && a.y < b.y + b.height - 1e-9 && b.y < a.y + a.height - 1e-9

describe('reparto de la banda (spec 5.3)', () => {
  it('la capacidad de la leyenda es 8, 12, 4 y 8 en A4 apaisada, A3 apaisada, A4 vertical y A3 vertical', () => {
    const capacities = SHEETS.map(([paper, orientation]) => layoutBand(sheetFor(paper, orientation)).legendCapacity)
    expect(capacities).toEqual([8, 12, 4, 8])
  })

  it('el cajetín mide 110 mm (90 en la hoja angosta) y la banda 36 mm', () => {
    expect(layoutBand(sheetFor('A4', 'landscape')).block).toMatchObject({ width: 110, height: 36 })
    expect(layoutBand(sheetFor('A4', 'portrait')).block).toMatchObject({ width: 90, height: 36 })
  })

  it('la banda queda pegada al marco inferior y el marco a 10 mm del borde', () => {
    for (const [paper, orientation] of SHEETS) {
      const sheet = sheetFor(paper, orientation)
      const layout = layoutBand(sheet)
      expect(layout.frame).toEqual({ x: 10, y: 10, width: sheet.widthMm - 20, height: sheet.heightMm - 20 })
      expect(layout.band.y + layout.band.height).toBeCloseTo(sheet.heightMm - 10, 9)
      expect(layout.band.height).toBe(36)
    }
  })

  it('ninguna caja se sale de la banda ni se pisa con otra, en las cuatro hojas', () => {
    for (const [paper, orientation] of SHEETS) {
      const layout = layoutBand(sheetFor(paper, orientation))
      const boxes = [layout.north, layout.scaleBar, layout.legend, layout.block].filter((b): b is BoxMm => b !== null)
      for (const box of boxes) expect(inside(box, layout.band), `${paper} ${orientation}`).toBe(true)
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          expect(overlap(boxes[i] as BoxMm, boxes[j] as BoxMm), `${paper} ${orientation} ${i}-${j}`).toBe(false)
        }
      }
    }
  })

  it('la barra de escala admite 55 mm en las hojas anchas y 30 mm en la A4 vertical', () => {
    expect(layoutBand(sheetFor('A4', 'landscape')).barMaxMm).toBe(55)
    expect(layoutBand(sheetFor('A3', 'portrait')).barMaxMm).toBe(55)
    expect(layoutBand(sheetFor('A4', 'portrait')).barMaxMm).toBe(30)
  })

  it('sin cajetín quedan solo el norte y la escala gráfica (banda de 16 mm, sin leyenda ni caja)', () => {
    for (const [paper, orientation] of SHEETS) {
      const sheet = sheetFor(paper, orientation, false)
      const layout = layoutBand(sheet)
      expect(layout.band.height).toBe(16)
      expect(layout.block).toBeNull()
      expect(layout.legend).toBeNull()
      expect(layout.legendCapacity).toBe(0)
      expect(inside(layout.north, layout.band)).toBe(true)
      expect(inside(layout.scaleBar, layout.band)).toBe(true)
      expect(overlap(layout.north, layout.scaleBar)).toBe(false)
    }
  })
})

describe('reparto de la caja del cajetín', () => {
  it('todos los campos caben dentro de la caja y no se pisan, en las dos anchuras', () => {
    for (const width of [110, 90]) {
      const block = { x: 177, y: 164, width, height: 36 }
      const layout = layoutBlock(block)
      const fields = [layout.logo, layout.sheetNo, layout.project, layout.level, layout.scale, layout.date, layout.author]
      for (const field of fields) expect(inside(field, layout.outline), `ancho ${width}`).toBe(true)
      for (let i = 0; i < fields.length; i++) {
        for (let j = i + 1; j < fields.length; j++) {
          expect(overlap(fields[i] as BoxMm, fields[j] as BoxMm), `ancho ${width} ${i}-${j}`).toBe(false)
        }
      }
      expect(layout.outline).toEqual(block)
    }
  })

  it('tiene tres filas de campos debajo del logotipo y rayas que no salen de la caja', () => {
    const block = { x: 0, y: 0, width: 110, height: 36 }
    const layout = layoutBlock(block)
    expect(layout.project.y).toBeGreaterThanOrEqual(layout.logo.y + layout.logo.height)
    expect(layout.level.y).toBeGreaterThanOrEqual(layout.project.y + layout.project.height)
    expect(layout.date.y).toBeGreaterThanOrEqual(layout.level.y + layout.level.height)
    for (const line of layout.dividers) {
      for (const x of [line.x1, line.x2]) expect(x).toBeGreaterThanOrEqual(0)
      for (const x of [line.x1, line.x2]) expect(x).toBeLessThanOrEqual(110)
      for (const y of [line.y1, line.y2]) expect(y).toBeGreaterThanOrEqual(0)
      for (const y of [line.y1, line.y2]) expect(y).toBeLessThanOrEqual(36)
    }
  })
})
