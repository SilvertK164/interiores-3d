import { PDFDocument } from './support/pdfkit'
import { describe, expect, it } from 'vitest'
import { type PdfRawLike, createPdfSurface, registerPdfFonts } from '../src/editor/export/pdf-surface'
import { BRAND } from '../src/lib/brand'
import { type SheetInput, drawSheet } from '../src/lib/export/draw-sheet'
import { mmToPt, sheetFor } from '../src/lib/export/sheet'
import { layoutBand, layoutBlock } from '../src/lib/export/title-block'
import { fontBytes } from './support/pdf-fonts'
import { readPdf } from './support/pdf-read'
import { createRecorder } from './support/recording-surface'

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
  legend: [{ kind: 'zone', label: 'Sala', color: '#1F5FE0', areaM2: 15.2 }],
}

async function buildPdf(input: SheetInput, fonts: 'dmsans' | 'helvetica' = 'dmsans'): Promise<Buffer> {
  const doc = new PDFDocument({ autoFirstPage: false, compress: false, margin: 0 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  const ended = new Promise<void>((resolve) => doc.on('end', () => resolve()))
  const raw = doc as unknown as PdfRawLike
  if (fonts === 'dmsans') registerPdfFonts(raw, fontBytes())
  doc.addPage({ size: [input.sheet.widthPt, input.sheet.heightPt], margin: 0 })
  drawSheet(createPdfSurface(raw, fonts), input)
  doc.end()
  await ended
  return Buffer.concat(chunks)
}

const joined = (items: { str: string }[]) => items.map((item) => item.str).join('')

describe('el cajetín en un PDF real de pdfkit 0.19.1 (criterios 11 y 12)', () => {
  it('la página mide A4 apaisada (595,28 × 841,89 con tolerancia de 0,5 pt) y el texto es texto de verdad', async () => {
    const [page] = await readPdf(await buildPdf(BASE))
    expect(Math.abs((page?.width ?? 0) - 841.89)).toBeLessThan(0.5)
    expect(Math.abs((page?.height ?? 0) - 595.28)).toBeLessThan(0.5)
    const text = joined(page?.items ?? [])
    for (const expected of ['Casa Alvear', 'Planta baja', '1:50', '12 de octubre de 2026', 'Silvert Quispe', 'Hoja 1 de 2', 'Sala · 15,2 m²']) {
      expect(text, expected).toContain(expected)
    }
  })

  it('incrusta DM Sans, no trae imágenes y conserva tildes, "ñ", "ő" y "Ł"', async () => {
    const pdf = await buildPdf({ ...BASE, projectName: 'Győr Łódź — Ñandú', author: 'María Peña' })
    expect(pdf.toString('latin1')).toMatch(/DMSans/)
    expect(pdf.toString('latin1')).not.toMatch(/\/Subtype\s*\/Image/)
    const [page] = await readPdf(pdf)
    const text = joined(page?.items ?? [])
    expect(text).toContain('Győr Łódź — Ñandú')
    expect(text).toContain('María Peña')
  })

  it('la línea de base del texto cae donde la pidió el dibujante (± 0,6 pt)', async () => {
    const recorder = createRecorder()
    drawSheet(recorder.surface, BASE)
    const wanted = recorder.texts.find((t) => t.value === 'Hoja 1 de 2')
    const [page] = await readPdf(await buildPdf(BASE))
    const item = page?.items.find((i) => i.str.includes('Hoja 1 de 2'))
    expect(wanted).toBeDefined()
    expect(item).toBeDefined()
    expect(Math.abs((item?.y ?? 0) - (BASE.sheet.heightPt - (wanted?.y ?? 0)))).toBeLessThan(0.6)
  })

  it('un nombre de 120 caracteres termina en "…" y no pasa del ancho de su caja', async () => {
    const name = 'Casa de campo con quincho y pileta '.repeat(4).slice(0, 120)
    const [page] = await readPdf(await buildPdf({ ...BASE, projectName: name }))
    const block = layoutBand(BASE.sheet).block
    if (!block) throw new Error('falta la caja')
    const box = layoutBlock(block).project
    const shown = page?.items.find((i) => i.str.endsWith('…'))
    expect(shown).toBeDefined()
    expect(shown?.width ?? 999).toBeLessThanOrEqual(mmToPt(box.width) + 0.5)
  })

  it('en Papel todos los colores del PDF son grises (R = G = B)', async () => {
    const pdf = (await buildPdf({ ...BASE, mode: 'paper' })).toString('latin1')
    const triples = [...pdf.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) (?:scn|SCN)/g)].map((m) => m.slice(1, 4).map(Number))
    expect(triples.length).toBeGreaterThan(0)
    for (const [r, g, b] of triples) {
      expect(Math.abs((r ?? 0) - (g ?? 0))).toBeLessThan(0.01)
      expect(Math.abs((g ?? 0) - (b ?? 0))).toBeLessThan(0.01)
    }
  })

  it('en Color aparece el Noche de la marca y en Papel no', async () => {
    const noche = /0\.0431\d* 0\.1215\d* 0\.3019\d* (scn|SCN)/
    expect((await buildPdf(BASE)).toString('latin1')).toMatch(noche)
    expect((await buildPdf({ ...BASE, mode: 'paper' })).toString('latin1')).not.toMatch(noche)
    expect(BRAND.noche).toBe('#0B1F4D')
  })

  it('con el respaldo Helvetica, lo que no es Latin-1 sale como "?" y no se incrusta DM Sans', async () => {
    const pdf = await buildPdf({ ...BASE, projectName: 'Łódź' }, 'helvetica')
    expect(pdf.toString('latin1')).not.toMatch(/DMSans/)
    const [page] = await readPdf(pdf)
    expect(joined(page?.items ?? [])).toContain('?ód?')
  })
})
