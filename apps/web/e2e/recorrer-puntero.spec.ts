import { expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { modeButton } from './support/shell'

// El puntero bloqueado solo lo concede el navegador a una ventana real: se corre a mano con
//   E2E_HEADED=1 pnpm --filter @interiores/web e2e e2e/recorrer-puntero.spec.ts --headed
test.skip(process.env.E2E_HEADED !== '1', 'Necesita una ventana real (puntero bloqueado): corre con E2E_HEADED=1 y --headed.')

test('Recorrer bloquea el puntero sobre el lienzo 3D y Esc lo libera y vuelve a Ver', async ({ page }) => {
  await createBlankProject(page, 'recorrer-puntero')
  await expect(modeButton(page, 'Ver')).toBeVisible({ timeout: 15_000 })
  await modeButton(page, 'Ver').click()
  await page.getByRole('toolbar', { name: 'Cámara' }).getByRole('button', { name: 'Recorrer' }).click()
  await expect.poll(async () => (await hook(page, 'state')).firstPerson, { timeout: 15_000 }).toBe(true)
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName ?? null), { timeout: 10_000 })
    .toBe('CANVAS')
  await expect(page.getByText('Recorriendo el proyecto. Pulsa Esc para volver.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBeNull()
  await expect.poll(async () => (await hook(page, 'state')).firstPerson).toBe(false)
})
