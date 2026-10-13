import { type Page, expect, test } from '@playwright/test'
import { counts, ready, templateCounts as expected } from './support/editor'
import { PROJECT_URL, createProjectViaUi, openNewProjectDialog } from './support/projects'

/** Espera a que la red se calme (modelos y texturas) y da una pausa corta: el editor sigue pidiendo cosas un instante después. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
  await page.waitForTimeout(1500)
}

/** Respuestas 4xx/5xx de modelos, texturas y plantillas (lo que rompería el criterio 5 del spec). */
function watchAssetFailures(page: Page): string[] {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() >= 400 && /\/(material|items|templates)\//.test(r.url())) failed.push(`${r.status()} ${r.url()}`)
  })
  return failed
}

async function createFrom(page: Page, kind: 'vivienda' | 'comercio', templateName: string) {
  await createProjectViaUi(page, { name: `E2E ${templateName} ${Date.now()}`, kind, template: templateName })
}

test('crear desde "Concept store" y recargar deja los mismos niveles, ambientes y piezas, sin texturas rotas', async ({ page }) => {
  const failed = watchAssetFailures(page)
  await createFrom(page, 'comercio', 'Concept store')
  const want = expected('concept-store')
  expect(want.level).toBe(2)
  await expect.poll(async () => (await counts(page)).zone).toBe(want.zone)
  const before = await counts(page)
  for (const type of Object.keys(want)) expect(before[type], type).toBe(want[type])

  await settle(page)
  await page.reload()
  await ready(page)
  await expect.poll(async () => (await counts(page)).zone).toBe(want.zone)
  const after = await counts(page)
  for (const type of Object.keys(want)) expect(after[type], type).toBe(want[type])
  await settle(page)
  expect(failed).toEqual([])
})

test('las cuatro plantillas se abren sin errores ni texturas rotas y dejan una captura para revisión visual', async ({ page }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  const failed = watchAssetFailures(page)
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  for (const [kind, name, file] of [
    ['comercio', 'Concept store', 'concept-store'],
    ['comercio', 'Café de especialidad', 'cafe'],
    ['comercio', 'Supermercado', 'supermercado'],
    ['vivienda', 'Loft', 'loft'],
  ] as const) {
    await createFrom(page, kind, name)
    await settle(page)
    await page.screenshot({ path: `test-results/plantillas/${file}.png` })
  }
  expect(errors).toEqual([])
  expect(failed).toEqual([])
})

test('un doble clic en "Crear proyecto" crea un solo proyecto', async ({ page }) => {
  const name = `E2E doble ${Date.now()}`
  await page.goto('/proyectos')
  const dialog = await openNewProjectDialog(page)
  await dialog.getByLabel('Nombre del proyecto').fill(name)
  await dialog.getByRole('button', { name: 'Crear proyecto' }).dblclick()
  await page.waitForURL(PROJECT_URL, { timeout: 60_000 })
  await page.goto('/proyectos')
  await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(1)
})

test('un nombre de solo espacios muestra un aviso claro y no crea nada', async ({ page }) => {
  await page.goto('/proyectos')
  const dialog = await openNewProjectDialog(page)
  await dialog.getByLabel('Nombre del proyecto').fill('     ')
  await dialog.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(dialog.getByText('Escribe un nombre para tu proyecto.')).toBeVisible()
  await expect(page).toHaveURL(/\/proyectos$/)
})
