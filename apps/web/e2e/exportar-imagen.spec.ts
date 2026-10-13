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

test('en blanco y negro la imagen se descarga sin color', async ({ page }) => {
  test.setTimeout(180_000)
  await openTemplate(page, 'loft')
  await modeButton(page, 'Ver').click()
  await page.locator('label', { hasText: 'Blanco y negro' }).click()
  const download = page.waitForEvent('download', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Exportar imagen 3D' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/-isometrico-bn\.png$/)
  const bytes = readFileSync((await file.path()) as string)
  const grey = await page.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob()
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(bitmap, 0, 0)
    const px = ctx?.getImageData(0, 0, canvas.width, canvas.height).data ?? new Uint8ClampedArray()
    for (let i = 0; i < px.length; i += 4) if (px[i] !== px[i + 1] || px[i + 1] !== px[i + 2]) return false
    return true
  }, bytes.toString('base64'))
  expect(grey).toBe(true)
})
