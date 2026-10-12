import { describe, expect, it } from 'vitest'
import { BRAND, WINDOW } from '../src/lib/brand'
import { type BlockData, drawBlock, drawLogo } from '../src/lib/export/draw-block'
import { type BoxMm, mmToPt, sheetFor } from '../src/lib/export/sheet'
import { paletteFor } from '../src/lib/export/surface'
import { layoutBand, layoutBlock } from '../src/lib/export/title-block'
import { colorsUsed, createRecorder } from './support/recording-surface'

const DATA: BlockData = {
  projectName: 'Casa Alvear',
  levelLabel: 'Planta baja',
  scale: 50,
  dateText: '12 de octubre de 2026',
  author: 'Silvert Quispe',
  sheetText: 'Hoja 1 de 2',
}
const blockOf = (paper: 'A4' | 'A3', orientation: 'landscape' | 'portrait'): BoxMm => {
  const box = layoutBand(sheetFor(paper, orientation)).block
  if (!box) throw new Error('falta la caja del cajetín')
  return box
}
const LAYOUT = layoutBlock(blockOf('A4', 'landscape'))
const draw = (mode: 'paper' | 'color', data: BlockData = DATA, layout = LAYOUT) => {
  const recorder = createRecorder()
  drawBlock(recorder.surface, layout, data, paletteFor(mode))
  return recorder
}
const values = (recorder: ReturnType<typeof createRecorder>) => recorder.texts.map((t) => t.value)

describe('logotipo (criterio 11: sin imágenes)', () => {
  it('son caminos: dos tramos de letras, el marco de la ventana como anillo par-impar y el sol', () => {
    const recorder = createRecorder()
    drawLogo(recorder.surface, { x: 100, y: 100, width: 40, height: 7 }, paletteFor('color'))
    const paths = recorder.calls.filter((c) => c.op === 'path')
    expect(paths).toHaveLength(3)
    expect(paths.filter((c) => c.args[2] === 'evenodd')).toHaveLength(1)
    expect(String(paths.find((c) => c.args[2] === 'evenodd')?.args[0])).toContain(WINDOW.glass)
    expect(recorder.calls.filter((c) => c.op === 'circle')).toHaveLength(1)
  })

  it('la geometría de la ventana que supone el dibujo es la de la marca (si cambia, recalcula FRAME_OUTER en draw-block.ts)', () => {
    expect(WINDOW.strokeWidth).toBe(11)
    expect(WINDOW.frame).toBe('M7 46V32A25 25 0 0 1 57 32V46A12 12 0 0 1 45 58H19A12 12 0 0 1 7 46Z')
    expect(WINDOW.glass).toBe('M12.5 46V32A19.5 19.5 0 0 1 51.5 32V46A6.5 6.5 0 0 1 45 52.5H19A6.5 6.5 0 0 1 12.5 46Z')
  })

  it('en Papel todo es negro y el sol es un círculo sin relleno; en Color, Noche y el sol relleno de Sol', () => {
    const paper = createRecorder()
    drawLogo(paper.surface, { x: 100, y: 100, width: 40, height: 7 }, paletteFor('paper'))
    expect(colorsUsed(paper).has(BRAND.sol)).toBe(false)
    expect(paper.calls.find((c) => c.op === 'circle')?.args[3]).toBe('stroke')
    const color = createRecorder()
    drawLogo(color.surface, { x: 100, y: 100, width: 40, height: 7 }, paletteFor('color'))
    expect(colorsUsed(color).has(BRAND.sol)).toBe(true)
    expect(color.calls.find((c) => c.op === 'circle')?.args[3]).toBe('fill')
  })
})

describe('caja del cajetín (criterio 11)', () => {
  it('lleva los cinco campos con su etiqueta y "Hoja N de M"', () => {
    const texts = values(draw('color'))
    for (const expected of ['Proyecto', 'Casa Alvear', 'Planta', 'Planta baja', 'Escala', '1:50', 'Fecha', '12 de octubre de 2026', 'Autor', 'Silvert Quispe', 'Hoja 1 de 2']) {
      expect(texts, expected).toContain(expected)
    }
  })

  it('un nombre de 120 caracteres se corta con "…" y no se sale de su caja; un autor largo (correo) también', () => {
    const name = 'Casa de campo con quincho y pileta '.repeat(4).slice(0, 120)
    const recorder = draw('color', { ...DATA, projectName: name, author: 'una.persona.con.un.correo.muy.largo@ejemplo.com.ar' })
    const project = recorder.texts.find((t) => t.value.endsWith('…') && t.style.size >= 9)
    expect(project).toBeDefined()
    expect(recorder.widthOf(project?.value ?? '', project?.style.size ?? 0, true)).toBeLessThanOrEqual(mmToPt(LAYOUT.project.width) + 1e-9)
    const author = recorder.texts.find((t) => t.value.startsWith('una.persona'))
    expect(recorder.widthOf(author?.value ?? '', author?.style.size ?? 0, false)).toBeLessThanOrEqual(mmToPt(LAYOUT.author.width) + 1e-9)
  })

  it('un nombre con "ő" o "Ł" llega intacto a la superficie (ella reparte las fuentes)', () => {
    expect(values(draw('color', { ...DATA, projectName: 'Győr Łódź' }))).toContain('Győr Łódź')
  })

  it('todo lo que se dibuja cabe dentro de la caja, en la ancha (110 mm) y en la angosta (90 mm)', () => {
    for (const [paper, orientation] of [['A4', 'landscape'], ['A4', 'portrait']] as const) {
      const box = blockOf(paper, orientation)
      const recorder = draw('color', DATA, layoutBlock(box))
      for (const call of recorder.calls.filter((c) => c.depth === 0 && (c.op === 'rect' || c.op === 'line'))) {
        const [x1, y1, a, b] = call.args as number[]
        const [x2, y2] = call.op === 'rect' ? [(x1 ?? 0) + (a ?? 0), (y1 ?? 0) + (b ?? 0)] : [a ?? 0, b ?? 0]
        for (const x of [x1, x2]) expect(x, `${paper} ${orientation}`).toBeGreaterThanOrEqual(mmToPt(box.x) - 1e-6)
        for (const x of [x1, x2]) expect(x, `${paper} ${orientation}`).toBeLessThanOrEqual(mmToPt(box.x + box.width) + 1e-6)
        for (const y of [y1, y2]) expect(y, `${paper} ${orientation}`).toBeGreaterThanOrEqual(mmToPt(box.y) - 1e-6)
        for (const y of [y1, y2]) expect(y, `${paper} ${orientation}`).toBeLessThanOrEqual(mmToPt(box.y + box.height) + 1e-6)
      }
    }
  })
})
