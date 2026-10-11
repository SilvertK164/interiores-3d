import { expect, test } from '@playwright/test'
import { createProjectViaUi } from './support/projects'

test('la pestaña Comercio lista el gabinete y el estante paramétricos y todo carga sin 404', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() === 404 && /\/items\//.test(r.url())) failed.push(r.url())
  })
  await createProjectViaUi(page, { name: `E2E comercio ${Date.now()}`, template: null, waitForEditor: false })
  await page.getByRole('button', { name: 'Comercio' }).click()
  // El gabinete y el estante paramétricos van primero en Furniture; todos los modelos salen de /items/ locales.
  await expect(page.getByText('Modular Cabinet')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Shelf', { exact: true })).toBeVisible()
  await page.waitForTimeout(3000)
  expect(failed).toEqual([])
})
