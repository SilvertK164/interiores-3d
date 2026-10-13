import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const IDS = readdirSync(join(process.cwd(), 'public', 'items'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

test('las 144 miniaturas tienen las cuatro esquinas transparentes y un mueble opaco al centro', async ({ page }) => {
  await page.goto('/logo.svg') // cualquier archivo del mismo origen: aquí solo hacen falta `fetch` y un lienzo
  const bad = await page.evaluate(async (ids) => {
    const failures: string[] = []
    for (const id of ids) {
      const response = await fetch(`/items/${id}/thumbnail.webp`, { cache: 'reload' })
      if (!response.ok) {
        failures.push(`${id} (no existe)`)
        continue
      }
      const bitmap = await createImageBitmap(await response.blob())
      const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d')
      if (!context) throw new Error('El navegador no ofrece un lienzo 2D')
      context.drawImage(bitmap, 0, 0)
      const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height)
      const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3] ?? 255
      const corners = [alphaAt(0, 0), alphaAt(width - 1, 0), alphaAt(0, height - 1), alphaAt(width - 1, height - 1)]
      let opaque = 0
      for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 200) opaque += 1
      if (corners.some((alpha) => alpha !== 0) || opaque < width * height * 0.02) failures.push(id)
    }
    return failures
  }, IDS)
  expect(IDS.length).toBeGreaterThanOrEqual(144)
  expect(bad, 'Miniaturas con esquina opaca, vacías o inexistentes').toEqual([])
})
