import { expect, test } from '@playwright/test'
import { createProjectViaUi } from './support/projects'
import { dockButton } from './support/shell'

test('la categoría Comercio lista el gabinete y el estante paramétricos y todo carga sin 404', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() === 404 && /\/items\//.test(r.url())) failed.push(r.url())
  })
  await createProjectViaUi(page, { name: `E2E comercio ${Date.now()}`, template: null, waitForEditor: false })
  await dockButton(page, 'Muebles').click({ timeout: 60_000 })
  const panel = page.getByRole('complementary', { name: 'Muebles' })
  await panel.getByRole('button', { name: 'Comercio', exact: true }).click()
  // El gabinete y el estante paramétricos están en la lista de comercio; todos los modelos salen de /items/ locales.
  await expect(panel.getByText('Gabinete modular')).toBeVisible({ timeout: 60_000 })
  await expect(panel.getByText('Estante', { exact: true })).toBeVisible()
  await page.waitForTimeout(3000)
  expect(failed).toEqual([])
})
