// Fotografía cada mueble de public/items con fondo transparente y guarda public/items/<id>/thumbnail.webp.
// No corre con `pnpm e2e`: se pide con `pnpm --filter @interiores/web items:thumbs [id ...]` (necesita Supabase local, como las demás capturas).
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const ITEMS = join(process.cwd(), 'public', 'items')
const only = (process.env.ITEM_IDS ?? '').split(',').filter(Boolean)
const IDS =
  only.length > 0
    ? only
    : readdirSync(ITEMS, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()

test('capturar las miniaturas de los muebles', async ({ page }) => {
  test.skip(process.env.CAPTURE_ITEMS !== '1', 'Solo con items:thumbs')
  test.setTimeout(Math.max(IDS.length, 1) * 25_000)
  const failed: string[] = []
  for (const id of IDS) {
    try {
      await page.goto(`/dev/miniaturas?id=${encodeURIComponent(id)}`)
      const canvas = page.locator(`[data-thumb-ready="${id}"] canvas`)
      await expect(canvas).toBeVisible({ timeout: 20_000 })
      const dataUrl = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/webp', 0.92))
      if (!dataUrl.startsWith('data:image/webp;base64,')) throw new Error('el navegador no codificó WebP')
      writeFileSync(join(ITEMS, id, 'thumbnail.webp'), Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'))
    } catch (error) {
      failed.push(`${id}: ${String(error).split('\n')[0]}`)
    }
  }
  expect(failed, 'Muebles que no se pudieron fotografiar').toEqual([])
})
