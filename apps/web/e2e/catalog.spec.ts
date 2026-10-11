import { expect, test } from '@playwright/test'

test('la pestaña Comercio lista las piezas de tienda y todas cargan sin 404', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() === 404 && /\/items\//.test(r.url())) failed.push(r.url())
  })
  await page.goto('/proyectos')
  await page.getByLabel('Nombre del proyecto').fill(`E2E comercio ${Date.now()}`)
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.waitForURL(/\/proyectos\/[0-9a-f-]{36}$/)
  await page.getByRole('button', { name: 'Comercio' }).click()
  // El panel de Pascal filtra por categoría y arranca en "Furniture": allí están el gabinete y las góndolas de Kenney.
  await expect(page.getByText('Góndola de cajas')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Modular Cabinet')).toBeVisible()
  // La caja registradora es un artefacto (`appliance`): aparece al cambiar de categoría.
  await page.getByRole('button', { name: 'Appliance' }).click()
  await expect(page.getByText('Caja registradora')).toBeVisible()
  await page.waitForTimeout(3000)
  expect(failed).toEqual([])
})
