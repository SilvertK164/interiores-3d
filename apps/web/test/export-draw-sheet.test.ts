import { describe, expect, it } from 'vitest'
import { BRAND, WINDOW } from '../src/lib/brand'
import { drawSheet, type SheetInput } from '../src/lib/export/draw-sheet'
import type { LegendEntry } from '../src/lib/export/legend'
import { mmToPt, sheetFor } from '../src/lib/export/sheet'
import { layoutBand, layoutBlock } from '../src/lib/export/title-block'
import { colorsUsed, createRecorder } from './support/recording-surface'

const zone = (label: string, areaM2: number): LegendEntry => ({ kind: 'zone', label, color: '#1F5FE0', areaM2 })
const BASE: SheetInput = {
  sheet: sheetFor('A4', 'landscape'),
  mode: 'color',
  scale: 50,
  projectName: 'Casa Alvear',
  levelLabel: 'Planta baja',
  author: 'Silvert Quispe',
  dateText: '12 de octubre de 2026',
  sheetNumber: 1,
  sheetTotal: 2,
  legend: [zone('Sala', 15.2), zone('Cocina', 8.4), { kind: 'material', label: 'Madera', color: '#C9A27A' }],
}
const draw = (overrides: Partial<SheetInput> = {}) => {
  const recorder = createRecorder()
  drawSheet(recorder.surface, { ...BASE, ...overrides })
  return recorder
}
const values = (recorder: ReturnType<typeof createRecorder>) => recorder.texts.map((t) => t.value)

describe('cajetín (criterio 11)', () => {
  it('lleva proyecto, planta, escala, fecha, autor, "Hoja N de M", norte y escala gráfica', () => {
    const texts = values(draw())
    for (const expected of ['Proyecto', 'Casa Alvear', 'Planta', 'Planta baja', 'Escala', '1:50', 'Fecha', '12 de octubre de 2026', 'Autor', 'Silvert Quispe', 'Hoja 1 de 2', 'N', '2 m']) {
      expect(texts, expected).toContain(expected)
    }
  })

  it('con "Incluir cajetín" apagado queda solo el norte y la escala gráfica (decisión de Silvert)', () => {
    const recorder = draw({ sheet: sheetFor('A4', 'landscape', false) })
    const texts = values(recorder)
    expect(texts).toContain('N')
    expect(texts).toContain('2 m')
    for (const absent of ['Proyecto', 'Casa Alvear', 'Hoja 1 de 2', 'Leyenda', 'Silvert Quispe']) expect(texts, absent).not.toContain(absent)
    expect(recorder.calls.filter((c) => c.op === 'path')).toHaveLength(0)
  })

  it('el logotipo son caminos: dos tramos de letras, el marco como contorno relleno y el sol', () => {
    const paths = draw().calls.filter((c) => c.op === 'path')
    expect(paths).toHaveLength(3)
    expect(paths.filter((c) => c.args[2] === 'evenodd')).toHaveLength(1)
    expect(String(paths.find((c) => c.args[2] === 'evenodd')?.args[0])).toContain(WINDOW.glass)
  })

  it('la geometría de la ventana que supone el dibujo es la de la marca (si cambia, recalcula FRAME_OUTER en draw-block.ts)', () => {
    expect(WINDOW.strokeWidth).toBe(11)
    expect(WINDOW.frame).toBe('M7 46V32A25 25 0 0 1 57 32V46A12 12 0 0 1 45 58H19A12 12 0 0 1 7 46Z')
    expect(WINDOW.glass).toBe('M12.5 46V32A19.5 19.5 0 0 1 51.5 32V46A6.5 6.5 0 0 1 45 52.5H19A6.5 6.5 0 0 1 12.5 46Z')
  })

  it('la barra de escala gráfica de 2 m mide 40,0 mm a 1:50 (criterio 6)', () => {
    const segments = draw().calls.filter((c) => c.op === 'rect' && Math.abs(Number(c.args[3]) - mmToPt(2)) < 1e-9)
    expect(segments).toHaveLength(4)
    const total = segments.reduce((sum, c) => sum + Number(c.args[2]), 0)
    expect(Math.abs(total - mmToPt(40))).toBeLessThan(mmToPt(0.5))
  })

  it('un nombre de 120 caracteres se corta con "…" y no se sale de su caja', () => {
    const name = 'Casa de campo con quincho y pileta '.repeat(4).slice(0, 120)
    const recorder = draw({ projectName: name })
    const sheet = BASE.sheet
    const block = layoutBand(sheet).block
    if (!block) throw new Error('falta la caja')
    const box = layoutBlock(block).project
    const shown = recorder.texts.find((t) => t.value.endsWith('…') && t.style.size >= 9)
    expect(shown).toBeDefined()
    expect(recorder.widthOf(shown?.value ?? '', shown?.style.size ?? 0, true)).toBeLessThanOrEqual(mmToPt(box.width) + 1e-9)
  })

  it('un nombre con "ő", "Ł" o un autor largo (correo) también se ajusta', () => {
    const recorder = draw({ projectName: 'Győr Łódź', author: 'una.persona.con.un.correo.muy.largo@ejemplo.com.ar' })
    expect(values(recorder)).toContain('Győr Łódź')
    const block = layoutBand(BASE.sheet).block
    if (!block) throw new Error('falta la caja')
    const box = layoutBlock(block).author
    const author = recorder.texts.find((t) => t.value.startsWith('una.persona'))
    expect(recorder.widthOf(author?.value ?? '', author?.style.size ?? 0, false)).toBeLessThanOrEqual(mmToPt(box.width) + 1e-9)
  })

  it('todo lo que se dibuja cabe dentro de la hoja, en las cuatro hojas, los dos modos y con o sin cajetín', () => {
    for (const [paper, orientation] of [['A4', 'landscape'], ['A3', 'landscape'], ['A4', 'portrait'], ['A3', 'portrait']] as const) {
      for (const mode of ['paper', 'color'] as const) {
        for (const titleBlock of [true, false]) {
          const sheet = sheetFor(paper, orientation, titleBlock)
          const recorder = draw({ sheet, mode })
          const label = `${paper} ${orientation} ${mode} ${titleBlock}`
          for (const call of recorder.calls.filter((c) => c.depth === 0)) {
            if (call.op === 'rect') {
              const [x, y, w, h] = call.args as number[]
              expect(x, label).toBeGreaterThanOrEqual(0)
              expect(y, label).toBeGreaterThanOrEqual(0)
              expect((x ?? 0) + (w ?? 0), label).toBeLessThanOrEqual(sheet.widthPt + 1e-6)
              expect((y ?? 0) + (h ?? 0), label).toBeLessThanOrEqual(sheet.heightPt + 1e-6)
            }
            if (call.op === 'line') {
              const [x1, y1, x2, y2] = call.args as number[]
              for (const x of [x1, x2]) expect(x, label).toBeLessThanOrEqual(sheet.widthPt + 1e-6)
              for (const y of [y1, y2]) expect(y, label).toBeLessThanOrEqual(sheet.heightPt + 1e-6)
            }
          }
          for (const text of recorder.texts.filter((t) => t.depth === 0)) {
            expect(text.x, label).toBeGreaterThanOrEqual(0)
            expect(text.y, label).toBeLessThanOrEqual(sheet.heightPt)
          }
        }
      }
    }
  })
})

describe('colores y líneas', () => {
  it('Papel usa solo negro, gris y blanco; el sol es un círculo sin relleno', () => {
    const recorder = draw({ mode: 'paper' })
    for (const color of colorsUsed(recorder)) expect(['#000000', '#555555', '#ffffff'], color).toContain(color)
    expect(colorsUsed(recorder).has(BRAND.sol)).toBe(false)
    const sun = recorder.calls.find((c) => c.op === 'circle')
    expect(sun?.args[3]).toBe('stroke')
  })

  it('Color usa Noche para el texto y Sol para el sol (relleno)', () => {
    const recorder = draw({ mode: 'color' })
    const colors = colorsUsed(recorder)
    expect(colors.has(BRAND.noche)).toBe(true)
    expect(colors.has(BRAND.sol)).toBe(true)
    expect(recorder.calls.find((c) => c.op === 'circle')?.args[3]).toBe('fill')
  })

  it('las líneas de la hoja (marco, cajetín, barra) miden 0,7 pt o menos', () => {
    const widths = draw().calls.filter((c) => c.op === 'lineWidth' && c.depth === 0).map((c) => Number(c.args[0]))
    expect(widths.length).toBeGreaterThan(0)
    for (const width of widths) expect(width).toBeLessThanOrEqual(0.7)
  })
})

describe('leyenda (solo en Color)', () => {
  const many = Array.from({ length: 10 }, (_, i) => zone(`Ambiente ${String(i).padStart(2, '0')}`, 10 + i))

  it('muestra nombre y m² de cada ambiente y el material del piso, con la muestra de color', () => {
    const texts = values(draw())
    expect(texts).toContain('Leyenda')
    expect(texts).toContain('Sala · 15,2 m²')
    expect(texts).toContain('Cocina · 8,4 m²')
    expect(texts).toContain('Piso: Madera')
  })

  it('si no entra, la última fila es "y N más" dentro del cajetín (A4 apaisada: 7 ambientes y "y 3 más")', () => {
    const texts = values(draw({ legend: many }))
    expect(texts.filter((t) => t.startsWith('Ambiente'))).toHaveLength(7)
    expect(texts).toContain('y 3 más')
  })

  it('sin ambientes dice "Sin ambientes dibujados" y no deja el hueco roto', () => {
    const texts = values(draw({ legend: [] }))
    expect(texts).toContain('Sin ambientes dibujados')
    expect(texts.some((t) => /más$/.test(t))).toBe(false)
  })

  it('en Papel no hay leyenda (no hay color que explicar)', () => {
    expect(values(draw({ mode: 'paper' }))).not.toContain('Leyenda')
  })

  it('una planta sin nombre propio llega ya como "Planta baja" y se imprime tal cual', () => {
    expect(values(draw({ levelLabel: 'Planta baja' }))).toContain('Planta baja')
    expect(values(draw({ levelLabel: 'Sótano 1' }))).toContain('Sótano 1')
  })
})
