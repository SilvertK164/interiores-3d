import { type Locator, type Page, expect } from '@playwright/test'
import { templateById } from '../../src/lib/templates'
import { createProjectViaUi } from './projects'
import { dock, dockButton } from './shell'

export const exportDialog = (page: Page) => page.getByRole('dialog', { name: 'Exportar plano' })
export const downloadButton = (dialog: Locator) => dialog.getByRole('button', { name: 'Descargar PDF' })

/** Crea un proyecto con una plantilla y espera a que el editor esté listo; devuelve el nombre del proyecto. */
export async function openTemplate(page: Page, id: string, label = 'plano'): Promise<string> {
  const template = templateById(id)
  if (!template) throw new Error(`Falta la plantilla ${id}`)
  const name = `E2E ${label} ${Date.now()}`
  await createProjectViaUi(page, { name, kind: template.kind, template: template.name })
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  return name
}

/** Abre el diálogo desde Más (Editar) y espera a que termine de medir. */
export async function openExportFromMore(page: Page): Promise<Locator> {
  await dockButton(page, 'Más').click()
  await page.getByRole('dialog', { name: 'Más opciones' }).getByRole('button', { name: 'Exportar plano' }).click()
  const dialog = exportDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Midiendo tu proyecto…')).toBeHidden({ timeout: 60_000 })
  return dialog
}

/** Elige una opción de radio como una persona: con un clic en su etiqueta (el radio en sí está oculto). */
export const choose = (dialog: Locator, name: string | RegExp) =>
  dialog.locator('label').filter({ has: dialog.page().getByRole('radio', { name }) }).first().click()

/** Pulsa "Descargar PDF" y guarda la descarga real en `path`. */
export async function downloadPdf(page: Page, dialog: Locator, path: string) {
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), downloadButton(dialog).click()])
  await download.saveAs(path)
  return download
}
