import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { MM_TO_PT, ptToMm, sheetFor } from '../src/lib/export/sheet'
import { type Paint, readPaints } from '../test/support/pdf-paint'
import { choose, downloadPdf, openExportFromMore, openTemplate } from './support/export'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dock } from './support/shell'

/** Lo que mide el PDF descargado, en milímetros desde el borde de arriba a la izquierda de la hoja. */
const read = (path: string) => readPaints(new Uint8Array(readFileSync(path)))
const mm = (paint: Paint, heightPt: number) => ({
  left: ptToMm(paint.box.x0),
  right: ptToMm(paint.box.x1),
  top: ptToMm(heightPt - paint.box.y1),
  bottom: ptToMm(heightPt - paint.box.y0),
})
const gray = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
  return Math.abs((r ?? 0) - (g ?? 0)) <= 2 && Math.abs((g ?? 0) - (b ?? 0)) <= 2
}

test('escala real en Papel: un muro de 5 m mide 100 mm y la barra de 2 m mide 40 mm a 1:50 (criterio 6)', async ({ page }) => {
  test.setTimeout(240_000)
  await createBlankProject(page, 'plano muro')
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await hook(page, 'addWallOf', 5)
  const dialog = await openExportFromMore(page)
  await choose(dialog, '1:50')
  await expect(dialog.getByRole('radio', { name: '1:50', exact: true })).toBeChecked()
  await downloadPdf(page, dialog, 'test-results/plano-muro-papel.pdf')

  const sheet = sheetFor('A4', 'landscape')
  const [content] = read('test-results/plano-muro-papel.pdf')
  expect(content).toBeDefined()
  const usableBottom = sheet.usable.y + sheet.usable.height
  // El muro: el relleno negro más ancho dentro del área del plano (los rellenos de abajo son el cajetín).
  const walls = (content?.paints ?? [])
    .filter((paint) => paint.fill && paint.fillColor === '#000000' && mm(paint, sheet.heightPt).bottom <= usableBottom + 0.5)
    .map((paint) => mm(paint, sheet.heightPt))
  expect(walls.length).toBeGreaterThan(0)
  const wallWidth = Math.max(...walls.map((box) => box.right - box.left))
  expect(Math.abs(wallWidth - 100), `muro de 5 m a 1:50 = ${wallWidth.toFixed(2)} mm`).toBeLessThan(1)

  // La barra de escala: 4 tramos de 2 mm de alto en la banda; entre todos suman 2 m a 1:50 = 40 mm.
  const bar = (content?.paints ?? [])
    .map((paint) => mm(paint, sheet.heightPt))
    .filter((box) => box.top >= usableBottom && Math.abs(box.bottom - box.top - 2) < 0.1 && box.right - box.left < 20)
  expect(bar).toHaveLength(4)
  const barLength = Math.max(...bar.map((box) => box.right)) - Math.min(...bar.map((box) => box.left))
  expect(Math.abs(barLength - 40), `barra de 2 m = ${barLength.toFixed(2)} mm`).toBeLessThan(0.5)
  expect(MM_TO_PT).toBeCloseTo(2.8346, 3)
})

test('Papel: solo grises, sin imágenes y líneas de 0,7 pt o menos en todas las plantas del Loft (criterio 9)', async ({ page }) => {
  test.setTimeout(300_000)
  await openTemplate(page, 'loft', 'plano papel')
  const dialog = await openExportFromMore(page)
  await choose(dialog, /^Papel$/)
  await dialog.getByRole('switch', { name: 'Incluir vistas isométricas' }).uncheck()
  await downloadPdf(page, dialog, 'test-results/plano-loft-grises.pdf')
  const pages = read('test-results/plano-loft-grises.pdf')
  expect(pages.length).toBeGreaterThanOrEqual(2)
  for (const [index, content] of pages.entries()) {
    expect(content.images, `página ${index + 1}: imágenes`).toBe(0)
    expect(content.clipped, `página ${index + 1}: el plano va recortado al área útil`).toBe(true)
    expect(content.paints.length, `página ${index + 1}: dibujo`).toBeGreaterThan(20)
    for (const paint of content.paints) {
      if (paint.fill) expect(gray(paint.fillColor), `relleno ${paint.fillColor}`).toBe(true)
      if (paint.stroke) {
        expect(gray(paint.strokeColor), `trazo ${paint.strokeColor}`).toBe(true)
        expect(paint.widthPt, `ancho de línea ${paint.widthPt.toFixed(3)} pt`).toBeLessThanOrEqual(0.7 + 0.01)
      }
    }
  }
})

test('Color: aparecen los colores de los ambientes y las imágenes de los muebles; Papel pesa menos (criterios 10 y 13)', async ({ page }) => {
  test.setTimeout(300_000)
  await openTemplate(page, 'loft', 'plano color')
  const dialog = await openExportFromMore(page)
  await choose(dialog, /^Papel$/)
  const paper = await downloadPdf(page, dialog, 'test-results/plano-loft-papel-peso.pdf')
  await choose(dialog, /^Color$/)
  const color = await downloadPdf(page, dialog, 'test-results/plano-loft-color.pdf')
  expect(paper.suggestedFilename()).toBe(color.suggestedFilename())
  const colorPages = read('test-results/plano-loft-color.pdf')
  expect(colorPages.reduce((total, content) => total + content.images, 0), 'muebles con su proyección cenital').toBeGreaterThan(5)
  const hues = new Set(colorPages.flatMap((content) => content.paints.filter((paint) => paint.fill && !gray(paint.fillColor)).map((paint) => paint.fillColor)))
  expect(hues.size, 'colores de ambientes, pisos y marca').toBeGreaterThanOrEqual(3)
  const paperBytes = readFileSync('test-results/plano-loft-papel-peso.pdf').length
  const colorBytes = readFileSync('test-results/plano-loft-color.pdf').length
  expect(paperBytes, `Papel ${(paperBytes / 1024).toFixed(0)} KB`).toBeLessThan(1_000_000)
  expect(colorBytes, `Color ${(colorBytes / 1024).toFixed(0)} KB`).toBeLessThan(5_000_000)
  expect(paperBytes).toBeLessThan(colorBytes)
})
