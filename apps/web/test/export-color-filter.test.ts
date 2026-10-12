import { PDFDocument, type PdfKitDoc } from './support/pdfkit'
import { describe, expect, it } from 'vitest'
import { withColorFilter } from '../src/lib/export/color-filter'

const paper = (color: string) => (color.toLowerCase() === '#ffffff' ? '#ffffff' : '#000000')

/** Dibuja con el documento dado y devuelve el contenido sin comprimir de la página. */
async function render(draw: (doc: PdfKitDoc) => void): Promise<string> {
  const doc = new PDFDocument({ autoFirstPage: false, compress: false, margin: 0 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  const ended = new Promise<void>((resolve) => doc.on('end', () => resolve()))
  doc.addPage({ size: [100, 100], margin: 0 })
  draw(doc)
  doc.end()
  await ended
  return Buffer.concat(chunks).toString('latin1')
}

describe('withColorFilter (el modo Papel convierte los colores fijos del renderizador de Pascal)', () => {
  it('filtra fillColor, strokeColor, fill, stroke y fillAndStroke, también encadenados', async () => {
    const pdf = await render((doc) => {
      const filtered = withColorFilter(doc, paper)
      filtered.save().fillColor('#374151').rect(10, 10, 20, 20).fill()
      filtered.strokeColor('#334155').lineWidth(1).moveTo(0, 0).lineTo(50, 50).stroke()
      filtered.rect(40, 40, 10, 10).fillAndStroke('#cbd5e1', '#475569')
      filtered.rect(60, 60, 5, 5).fill('#111827')
      filtered.fillColor('#FFFFFF').rect(70, 70, 5, 5).fill()
    })
    expect(pdf).toContain('0 0 0 scn')
    expect(pdf).toContain('0 0 0 SCN')
    expect(pdf).toContain('1 1 1 scn')
    // Ningún gris azulado de los de Pascal (#374151 = 0.2157 0.2549 0.3176; #334155 = 0.2 0.2549 0.3333).
    expect(pdf).not.toMatch(/0\.2\d* 0\.2\d* 0\.3\d* (scn|SCN)/)
    expect(pdf).not.toMatch(/0\.7\d* 0\.8\d* 0\.8\d* (scn|SCN)/)
  })

  it('deja pasar todo lo demás sin tocar (reglas de relleno, números, métodos de dibujo)', async () => {
    const pdf = await render((doc) => {
      const filtered = withColorFilter(doc, paper)
      filtered.rect(5, 5, 10, 10).fill('#ffffff', 'even-odd')
      filtered.circle(50, 50, 10).stroke()
    })
    expect(pdf).toContain('1 1 1 scn')
    expect(pdf).toMatch(/f\*/)
  })

  it('no cambia el documento original: sin el filtro, el color sigue siendo el que se pidió', async () => {
    const pdf = await render((doc) => {
      doc.fillColor('#374151').rect(1, 1, 5, 5).fill()
    })
    expect(pdf).toMatch(/0\.2\d* 0\.2\d* 0\.3\d* scn/)
  })
})
