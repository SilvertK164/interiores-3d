import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { readPdf } from '../test/support/pdf-read'
import { downloadPdf, openExportFromMore, openTemplate } from './support/export'

test('el PDF suma una hoja isométrica por planta con cajetín y sin escala; el paginador la muestra y el diálogo cabe sin desplazarse', async ({ page }) => {
  test.setTimeout(300_000)
  await openTemplate(page, 'loft', 'plano iso')
  const dialog = await openExportFromMore(page)
  const body = dialog.locator('div.overflow-y-auto').first()
  const { scroll, client } = await body.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }))
  expect(scroll, 'el cuerpo del diálogo no necesita desplazarse').toBeLessThanOrEqual(client + 1)
  await expect(dialog.getByRole('switch', { name: 'Incluir vistas isométricas' })).toBeChecked()
  // Paginar hasta la hoja isométrica: el paginador la nombra.
  const next = dialog.getByRole('button', { name: /siguiente/i })
  await next.click()
  await next.click()
  await expect(dialog.getByText(/Isométrico · 3 de 4/)).toBeVisible({ timeout: 60_000 })
  await expect(dialog.getByRole('img', { name: /Vista previa de la hoja del plano/ })).toBeVisible({ timeout: 60_000 })
  await downloadPdf(page, dialog, 'test-results/plano-loft-iso.pdf')
  const pages = await readPdf(new Uint8Array(readFileSync('test-results/plano-loft-iso.pdf')))
  expect(pages).toHaveLength(4)
  const text = pages.map((p) => p.items.map((i) => i.str).join(''))
  expect(text[2]).toContain('Isométrico')
  expect(text[2]).toContain('Sin escala')
  expect(text[2]).toContain('Hoja 3 de 4')
  expect(text[0]).toContain('1:')
})
