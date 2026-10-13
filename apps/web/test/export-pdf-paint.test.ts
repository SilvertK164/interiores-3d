import { describe, expect, it } from 'vitest'
import { readPaints } from './support/pdf-paint'
import { PDFDocument, type PdfKitDoc } from './support/pdfkit'

/** Un PDF de 200 × 100 pt con lo que dibuje `draw`, sin comprimir. */
async function pdfWith(draw: (doc: PdfKitDoc) => void, compress = false): Promise<Uint8Array> {
  const doc = new PDFDocument({ autoFirstPage: false, compress, margin: 0 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  const ended = new Promise<void>((resolve) => doc.on('end', () => resolve()))
  doc.addPage({ size: [200, 100], margin: 0 })
  draw(doc)
  doc.end()
  await ended
  return new Uint8Array(Buffer.concat(chunks))
}

describe('pdf-paint (medir el PDF real sin pdfjs: caja, color y ancho efectivo de cada trazo)', () => {
  it('da la caja en puntos de la hoja con el origen abajo a la izquierda', async () => {
    const [page] = readPaints(await pdfWith((doc) => doc.rect(10, 20, 50, 30).fill('#000000')))
    expect(page?.paints).toHaveLength(1)
    const [paint] = page?.paints ?? []
    expect(paint?.box.x0).toBeCloseTo(10, 3)
    expect(paint?.box.x1).toBeCloseTo(60, 3)
    // pdfkit dibuja con el origen arriba: 20 pt desde el borde de arriba son y = 100 - 20 en la hoja.
    expect(paint?.box.y1).toBeCloseTo(80, 3)
    expect(paint?.box.y0).toBeCloseTo(50, 3)
    expect(paint?.fillColor).toBe('#000000')
  })

  it('aplica translate y scale: 5 unidades a 2 aumentos son 10 puntos', async () => {
    const [page] = readPaints(await pdfWith((doc) => doc.save().translate(10, 20).scale(2).rect(0, 0, 5, 3).fill('#B97A00').restore()))
    const [paint] = page?.paints ?? []
    expect((paint?.box.x1 ?? 0) - (paint?.box.x0 ?? 0)).toBeCloseTo(10, 3)
    expect((paint?.box.y1 ?? 0) - (paint?.box.y0 ?? 0)).toBeCloseTo(6, 3)
    expect(paint?.fillColor).toBe('#b97a00')
  })

  it('el ancho de línea es el efectivo (por la escala de la matriz) y distingue relleno de trazo', async () => {
    const [page] = readPaints(
      await pdfWith((doc) => {
        doc.save().scale(0.5).lineWidth(2).moveTo(0, 0).lineTo(100, 0).stroke('#333333').restore()
        doc.rect(0, 0, 10, 10).fill('#ffffff')
      }),
    )
    const [line, square] = page?.paints ?? []
    expect(line?.stroke).toBe(true)
    expect(line?.fill).toBe(false)
    expect(line?.widthPt).toBeCloseTo(1, 3)
    expect(line?.strokeColor).toBe('#333333')
    expect(square?.fill).toBe(true)
    expect(square?.fillColor).toBe('#ffffff')
  })

  it('lee también los flujos comprimidos (los PDF que se descargan)', async () => {
    const [page] = readPaints(await pdfWith((doc) => doc.rect(0, 0, 40, 10).fill('#112233'), true))
    expect(page?.paints[0]?.fillColor).toBe('#112233')
  })

  it('un dibujo simple no tiene imágenes ni recorte', async () => {
    const [page] = readPaints(await pdfWith((doc) => doc.rect(0, 0, 20, 20).fill('#000000')))
    expect(page?.images).toBe(0)
    expect(page?.clipped).toBe(false)
  })
})
