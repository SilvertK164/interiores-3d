import { readFileSync } from 'node:fs'
import { type Page, expect, test } from '@playwright/test'
import { exportFileName } from '../src/lib/export/file-name'
import { fitScale, largestFittingScale, maxExtent } from '../src/lib/export/fit'
import { sheetFor } from '../src/lib/export/sheet'
import { SCALES } from '../src/lib/export/types'
import { readPdf } from '../test/support/pdf-read'
import { choose, downloadButton, downloadPdf, exportDialog, openExportFromMore, openTemplate } from './support/export'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dock, dockButton, modeButton } from './support/shell'

/** Las escalas habilitadas y la elegida de cada hoja siguen la regla de cabida, con las medidas reales del proyecto. */
async function expectScalesFollowTheRule(page: Page, dialog: ReturnType<typeof exportDialog>) {
  const levels = (await hook(page, 'planMeasure')).filter((level) => !level.empty)
  const extent = maxExtent(levels)
  for (const paper of ['A4', 'A3'] as const) {
    await choose(dialog, new RegExp(`^${paper}$`))
    await expect(dialog.getByRole('radio', { name: paper, exact: true })).toBeChecked()
    const landscape = await dialog.getByRole('radio', { name: /^Apaisada/ }).isChecked()
    const sheet = sheetFor(paper, landscape ? 'landscape' : 'portrait')
    for (const scale of SCALES) {
      const radio = dialog.getByRole('radio', { name: `1:${scale}`, exact: true })
      if (fitScale(extent, sheet, scale).fits) await expect(radio, `${paper} 1:${scale}`).toBeEnabled()
      else {
        await expect(radio, `${paper} 1:${scale}`).toBeDisabled()
        await expect(radio).toHaveAccessibleDescription(/no cabe en/)
      }
    }
    const best = largestFittingScale(extent, sheet)
    if (best !== null) {
      await expect(dialog.getByRole('radio', { name: `1:${best}`, exact: true })).toBeChecked()
      const fit = fitScale(extent, sheet, best)
      await expect(dialog.getByRole('status').filter({ hasText: 'Cabe en la hoja' })).toContainText(`usa ${fit.percent} % del ${fit.axis === 'width' ? 'ancho' : 'alto'}`)
    }
  }
}

test('se abre desde Más en Editar con el foco en el primer control; las flechas cambian de hoja; Esc cierra, devuelve el foco y no desarma la herramienta', async ({ page }) => {
  test.setTimeout(180_000)
  // Pascal monta el plano con flushSync para medirlo: React no lo admite dentro de un efecto (se mide desde un turno aparte).
  const problems: string[] = []
  page.on('console', (message) => message.type() === 'error' && problems.push(message.text()))
  page.on('pageerror', (error) => problems.push(error.message))
  await openTemplate(page, 'loft')
  await hook(page, 'armWall')
  await dockButton(page, 'Más').click()
  const more = page.getByRole('dialog', { name: 'Más opciones' })
  for (const name of ['Compartir', 'Renderizar']) await expect(more.getByRole('button', { name })).toHaveCount(0)
  await expect(more.getByText('Pronto')).toHaveCount(0)
  await expect(more.getByRole('button', { name: 'Exportar plano' })).toBeEnabled()
  await more.getByRole('button', { name: 'Exportar plano' }).click()
  const dialog = exportDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('radio', { name: 'A4', exact: true })).toBeFocused({ timeout: 60_000 })
  expect(problems.filter((text) => /flushSync/.test(text))).toEqual([])
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('radio', { name: 'A3', exact: true })).toBeChecked()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(dockButton(page, 'Más')).toBeFocused()
  expect((await hook(page, 'state')).tool).toBe('wall')
})

test('en Ver el botón Exportar plano abre el mismo diálogo y el foco vuelve a él al cerrarlo', async ({ page }) => {
  test.setTimeout(180_000)
  await openTemplate(page, 'loft')
  await modeButton(page, 'Ver').click()
  await expect(page.getByRole('complementary', { name: 'Vista 3D' })).toBeVisible()
  for (const name of ['Compartir', 'Renderizar']) await expect(page.getByRole('button', { name })).toBeDisabled()
  const button = page.getByRole('button', { name: 'Exportar plano', exact: true })
  await button.click()
  const dialog = exportDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('radio', { name: 'A4', exact: true })).toBeEnabled({ timeout: 60_000 })
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  await expect(button).toBeFocused()
})

test('las escalas que no caben están deshabilitadas con su motivo y la mayor que cabe viene elegida: Loft y Supermercado', async ({ page }) => {
  test.setTimeout(300_000)
  // La vista previa se vuelve a dibujar con cada cambio de hoja: ningún error de página (por ejemplo al soltar pdf.js).
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openTemplate(page, 'loft')
  const loft = await openExportFromMore(page)
  await expectScalesFollowTheRule(page, loft)
  await page.keyboard.press('Escape')
  await expect(loft).toBeHidden()
  await page.goto('/proyectos')
  await openTemplate(page, 'supermercado', 'plano comercio')
  const shop = await openExportFromMore(page)
  await expectScalesFollowTheRule(page, shop)
  expect(pageErrors).toEqual([])
})

test('un edificio que no cabe en ninguna escala lo dice y no deja descargar (Review Focus 3)', async ({ page }) => {
  test.setTimeout(180_000)
  await createBlankProject(page, 'plano enorme')
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await hook(page, 'addWallOf', 150)
  const dialog = await openExportFromMore(page)
  for (const scale of SCALES) await expect(dialog.getByRole('radio', { name: `1:${scale}`, exact: true })).toBeDisabled()
  await expect(dialog.getByText('El proyecto no cabe en esta hoja ni a 1:100. Prueba con A3 o quita plantas.')).toBeVisible()
  await expect(downloadButton(dialog)).toBeDisabled()
  await choose(dialog, /^A3$/)
  await expect(dialog.getByText('El proyecto no cabe en esta hoja ni a 1:100. Prueba con otra orientación o quita plantas.')).toBeVisible()
  await expect(downloadButton(dialog)).toBeDisabled()
})

test('un proyecto sin nada dibujado dice que no hay nada que dibujar, deja la planta vacía desmarcada y no descarga (Review Focus 1)', async ({ page }) => {
  test.setTimeout(180_000)
  await createBlankProject(page, 'plano vacio')
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  const dialog = await openExportFromMore(page)
  await expect(dialog.getByText('Aún no hay nada que dibujar. Traza muros o ambientes y vuelve a intentarlo.')).toBeVisible()
  const level = dialog.getByRole('checkbox', { name: /Planta baja \(vacía\)/ })
  await expect(level).toBeDisabled()
  await expect(level).not.toBeChecked()
  await expect(downloadButton(dialog)).toBeDisabled()
})

test('la descarga es real: nombre <proyecto>-planos.pdf, una página por planta del tamaño de la hoja, "Hoja N de M", fecha, autor y vista previa con píxeles', async ({ page }) => {
  test.setTimeout(300_000)
  const name = await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  const levels = (await hook(page, 'planMeasure')).filter((level) => !level.empty)
  // La vista previa dibuja la página real: el lienzo termina con píxeles que no son blancos.
  const canvas = dialog.getByRole('img', { name: /Vista previa de la hoja del plano/ })
  await expect(canvas).toBeVisible({ timeout: 60_000 })
  await expect
    .poll(() => canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement
      const data = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? []
      let dark = 0
      for (let i = 0; i < data.length; i += 4) if ((data[i] ?? 255) < 200 && (data[i + 3] ?? 0) > 0) dark += 1
      return dark
    }), { timeout: 30_000 })
    .toBeGreaterThan(500)

  const download = await downloadPdf(page, dialog, 'test-results/plano-loft-papel.pdf')
  expect(download.suggestedFilename()).toBe(exportFileName(name))
  expect(download.suggestedFilename()).toMatch(/^E2E-plano-\d+-planos\.pdf$/)
  const pages = await readPdf(new Uint8Array(readFileSync('test-results/plano-loft-papel.pdf')))
  expect(pages).toHaveLength(levels.length)
  for (const [index, pdfPage] of pages.entries()) {
    expect(Math.abs(pdfPage.width - 841.89), `página ${index + 1} ancho`).toBeLessThan(0.5)
    expect(Math.abs(pdfPage.height - 595.28), `página ${index + 1} alto`).toBeLessThan(0.5)
    const text = pdfPage.items.map((item) => item.str).join('')
    expect(text).toContain(`Hoja ${index + 1} de ${levels.length}`)
    expect(text).toContain(name)
    // El correo de la cuenta de prueba es largo y el cajetín lo corta con "…" para no salirse de su caja.
    expect(text).toContain('Autor')
    expect(text).toContain('e2e-')
    expect(text).toMatch(/\d{1,2} de [a-záéíóú]+ de \d{4}/)
    expect(text).not.toMatch(/Floor plan|Construction Schedules|Level \d|Ground Floor/)
  }
  await expect(downloadButton(dialog)).toBeEnabled()
})

test('doble clic en "Descargar PDF" descarga una sola vez', async ({ page }) => {
  test.setTimeout(240_000)
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  let downloads = 0
  page.on('download', () => {
    downloads += 1
  })
  await downloadButton(dialog).dblclick()
  await expect.poll(() => downloads, { timeout: 120_000 }).toBe(1)
  await page.waitForTimeout(3000)
  expect(downloads).toBe(1)
})

test('Esc durante la generación la cancela sin descargar nada y el diálogo sigue abierto; otro Esc lo cierra', async ({ page }) => {
  test.setTimeout(300_000)
  await page.route('**/floor-plan.png', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  await choose(dialog, /^Color$/)
  let downloads = 0
  page.on('download', () => {
    downloads += 1
  })
  await downloadButton(dialog).click()
  await expect(dialog.getByText(/Generando planta \d de \d…/)).toBeVisible({ timeout: 30_000 })
  // El foco no se pierde mientras genera (un botón deshabilitado lo suelta y Esc dejaría de llegar al diálogo).
  await expect(downloadButton(dialog)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog.getByText('Cancelaste la exportación.')).toBeVisible({ timeout: 60_000 })
  await expect(dialog).toBeVisible()
  expect(downloads).toBe(0)
  await expect(downloadButton(dialog)).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('en 390 px el diálogo se apila con la vista previa arriba, cabe sin desplazamiento horizontal y los botones miden 44 px o más', async ({ page }) => {
  test.setTimeout(240_000)
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const box = await dialog.boundingBox()
  expect(box?.width ?? 999).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  const preview = await dialog.getByRole('region', { name: 'Vista previa' }).boundingBox()
  const options = await dialog.getByRole('group', { name: 'Hoja' }).boundingBox()
  expect(preview?.y ?? 9999).toBeLessThan(options?.y ?? 0)
  for (const name of ['Descargar PDF', 'Cancelar', 'Cerrar']) {
    const button = await dialog.getByRole('button', { name, exact: true }).boundingBox()
    expect(button?.height ?? 0, name).toBeGreaterThanOrEqual(43.5)
  }
})
