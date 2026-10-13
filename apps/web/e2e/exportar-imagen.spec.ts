import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { openTemplate } from './support/export'
import { modeButton } from './support/shell'

test('en Ver, Exportar imagen 3D descarga un PNG isométrico y deja la cámara como estaba', async ({ page }) => {
  test.setTimeout(180_000)
  await openTemplate(page, 'loft')
  await modeButton(page, 'Ver').click()
  const download = page.waitForEvent('download', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Exportar imagen 3D' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/-isometrico\.png$/)
  const bytes = readFileSync((await file.path()) as string)
  expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
  expect(bytes.length).toBeGreaterThan(5_000)
  await expect(page.getByRole('button', { name: 'Exportar imagen 3D' })).toBeEnabled()
  await expect(page.getByText('No pudimos generar la imagen')).toHaveCount(0)
})
