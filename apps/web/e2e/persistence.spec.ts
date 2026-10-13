import { type Page, expect, test } from '@playwright/test'
import { createAccount, signInViaUi } from './support/user'

const wallCount = (page: Page) => page.evaluate(() => (window as unknown as { __e2e: { wallCount(): number } }).__e2e.wallCount())
const addWall = (page: Page) => page.evaluate(() => (window as unknown as { __e2e: { addWall(): void } }).__e2e.addWall())

async function openNewProject(page: Page, name: string): Promise<string> {
  await page.goto('/proyectos')
  await page.getByLabel('Nombre del proyecto').fill(name)
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.waitForURL(/\/proyectos\/[0-9a-f-]{36}$/)
  await page.waitForFunction(() => (window as unknown as { __e2e?: { ready(): boolean } }).__e2e?.ready())
  return page.url()
}

test('un muro dibujado sobrevive a recargar (criterio 3)', async ({ page }) => {
  const url = await openNewProject(page, `E2E persistencia ${Date.now()}`)
  const before = await wallCount(page)
  await addWall(page)
  await expect(page.getByTestId('save-status')).toHaveText('Guardado', { timeout: 30_000 })
  expect(await wallCount(page)).toBe(before + 1) // guardar no debe borrar lo editado
  await page.goto(url)
  await page.waitForFunction(() => (window as unknown as { __e2e?: { ready(): boolean } }).__e2e?.ready())
  expect(await wallCount(page)).toBe(before + 1)
})

test('recargar la página antes de que termine el autoguardado no pierde el muro (guardado de cierre con keepalive)', async ({ page }) => {
  const url = await openNewProject(page, `E2E cierre ${Date.now()}`)
  const before = await wallCount(page)
  await addWall(page)
  await page.reload() // dentro de los 2 s de debounce: solo el guardado de cierre puede salvar el muro
  await page.waitForFunction(() => (window as unknown as { __e2e?: { ready(): boolean } }).__e2e?.ready())
  expect(page.url()).toBe(url)
  expect(await wallCount(page)).toBe(before + 1)
})

test('dos pestañas: la segunda en guardar recibe 409 y no pierde su trabajo (criterio 5)', async ({ browser, page }) => {
  const url = await openNewProject(page, `E2E conflicto ${Date.now()}`)
  const second = await (await browser.newContext({ storageState: 'e2e/.auth/state.json' })).newPage()
  await second.goto(url)
  await second.waitForFunction(() => (window as unknown as { __e2e?: { ready(): boolean } }).__e2e?.ready())

  await addWall(page)
  await expect(page.getByTestId('save-status')).toHaveText('Guardado', { timeout: 30_000 })

  const localBefore = await wallCount(second)
  await addWall(second)
  await expect(second.getByTestId('save-alert')).toContainText('versión más nueva', { timeout: 30_000 })
  expect(await wallCount(second)).toBe(localBefore + 1)
})

test('otra cuenta no ve el proyecto: la API responde 404 y la pantalla lo explica (criterio 4)', async ({ browser, page }) => {
  const url = await openNewProject(page, `E2E privado ${Date.now()}`)
  const other = await (await browser.newContext()).newPage()
  await signInViaUi(other, await createAccount())
  await other.goto(url)
  await expect(other.getByText('No encontramos ese proyecto.')).toBeVisible({ timeout: 30_000 })
})
