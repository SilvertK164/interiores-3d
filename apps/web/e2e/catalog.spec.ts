import { expect, test } from '@playwright/test'

test('la pestaña Comercio lista el gabinete y el estante paramétricos y todo carga sin 404', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() === 404 && /\/items\//.test(r.url())) failed.push(r.url())
  })
  await page.goto('/proyectos')
  await page.getByLabel('Nombre del proyecto').fill(`E2E comercio ${Date.now()}`)
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.waitForURL(/\/proyectos\/[0-9a-f-]{36}$/)
  await page.getByRole('button', { name: 'Comercio' }).click()
  // El gabinete y el estante paramétricos van primero en Furniture; todos los modelos salen de /items/ locales.
  await expect(page.getByText('Modular Cabinet')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Shelf', { exact: true })).toBeVisible()
  await page.waitForTimeout(3000)
  expect(failed).toEqual([])
})
