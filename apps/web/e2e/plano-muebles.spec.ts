import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { viewButton } from './support/shell'

type Item = { id: string; asset: { id: string } }

/** El elemento del plano 2D de un mueble y la imagen que usa (si dibuja una). */
const planImage = (page: Page, nodeId: string) =>
  page.evaluate((id) => {
    const el = document.querySelector(`[data-floorplan-scene] [data-node-id="${id}"]`)
    const image = el?.querySelector('image')
    return { drawn: Boolean(el), href: image?.getAttribute('href') ?? image?.getAttribute('xlink:href') ?? null }
  }, nodeId)

test('el plano 2D dibuja la proyección en planta de cada mueble (PNG oficial) y las alfombras quedan debajo', async ({ page }) => {
  test.setTimeout(180_000)
  await createProjectViaUi(page, { name: `E2E plano muebles ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  await page.waitForTimeout(3000)
  await viewButton(page, '2D').click()
  await page.waitForTimeout(3500)
  const items = (await hook(page, 'nodesOf', 'item')) as unknown as Item[]
  const byAsset = (asset: string) => items.find((i) => i.asset.id === asset) as Item
  for (const asset of ['sofa', 'floor-lamp', 'dining-table', 'office-chair']) {
    const found = byAsset(asset)
    expect(found, asset).toBeTruthy()
    await expect.poll(async () => (await planImage(page, found.id)).href, { message: asset }).toBe(`/items/${asset}/floor-plan.png`)
  }
  // Ningún mueble del catálogo cae al rectángulo ámbar: todos dibujan su imagen.
  const without: string[] = []
  let seen = 0
  for (const item of items) {
    const { drawn, href } = await planImage(page, item.id)
    if (!drawn) continue // de otra planta: el plano muestra solo la activa
    seen++
    if (!/^\/items\/[^/]+\/floor-plan\.png$/.test(href ?? '')) without.push(`${item.asset.id}:${href}`)
  }
  expect(without).toEqual([])
  expect(seen).toBeGreaterThan(15)

  // La alfombra se dibuja antes (debajo) que la mesa.
  const carpet = byAsset('rectangular-carpet')
  const table = byAsset('dining-table')
  const before = await page.evaluate(
    ([a, b]) => {
      const first = document.querySelector(`[data-floorplan-scene] [data-node-id="${a}"]`)
      const second = document.querySelector(`[data-floorplan-scene] [data-node-id="${b}"]`)
      return Boolean(first && second && first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
    },
    [carpet.id, table.id],
  )
  expect(before).toBe(true)
})

test('una alfombra colocada desde el catálogo pasa al principio de la planta y Deshacer la quita de una vez', async ({ page }) => {
  test.setTimeout(180_000)
  await createProjectViaUi(page, { name: `E2E alfombra ${Date.now()}`, kind: 'vivienda', template: null })
  await page.waitForTimeout(3000)
  await page.getByRole('toolbar', { name: 'Herramientas de edición' }).getByRole('button', { name: 'Muebles', exact: true }).click()
  const panel = page.getByRole('complementary', { name: 'Muebles' })
  await panel.getByRole('searchbox', { name: 'Buscar muebles' }).fill('alfombra rect')
  await panel.getByRole('button', { name: /Alfombra rectangular/ }).click()
  await hook(page, 'addZone')
  await page.waitForTimeout(2500)
  await hook(page, 'placeAt', 2, 2)
  await expect.poll(async () => ((await hook(page, 'nodesOf', 'item')) as unknown as Item[]).length).toBe(1)
  const level = ((await hook(page, 'nodesOf', 'level')) as unknown as { children: string[] }[])[0] as { children: string[] }
  const carpet = ((await hook(page, 'nodesOf', 'item')) as unknown as Item[])[0] as Item
  expect(level.children[0]).toBe(carpet.id)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect.poll(async () => ((await hook(page, 'nodesOf', 'item')) as unknown as Item[]).length).toBe(0)
})

/** Todas las imágenes que dibuja el plano 2D (href) y su código HTTP. */
const planImageStatuses = (page: Page) =>
  page.evaluate(async () => {
    const hrefs = [...new Set([...document.querySelectorAll('[data-floorplan-scene] image')].map((i) => i.getAttribute('href') ?? ''))].filter(Boolean)
    return Promise.all(hrefs.map(async (href) => ({ href, status: (await fetch(href)).status })))
  })

test('un proyecto guardado con rutas viejas (floor-plan.svg) se abre sin imágenes rotas en el plano 2D', async ({ page }) => {
  test.setTimeout(240_000)
  await createProjectViaUi(page, { name: `E2E rutas viejas ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  await page.waitForTimeout(3000)
  expect(((await hook(page, 'breakItemAssets')) as number) > 10).toBe(true)
  // Se espera a que el autoguardado escriba el proyecto con las rutas viejas.
  const chip = page.getByTestId('save-status')
  await expect(chip).not.toHaveText('Guardado', { timeout: 15_000 })
  await expect(chip).toHaveText('Guardado', { timeout: 40_000 })
  await page.reload()
  await expect(page.getByRole('toolbar', { name: 'Herramientas de edición' })).toBeVisible({ timeout: 60_000 })
  await viewButton(page, '2D').click()
  await page.waitForTimeout(4000)
  const statuses = await planImageStatuses(page)
  expect(statuses.length).toBeGreaterThan(10)
  expect(statuses.filter((s) => s.status !== 200)).toEqual([])
  expect(statuses.some((s) => s.href.endsWith('.svg'))).toBe(false)
})

test('barrido: todas las imágenes del plano de cada plantilla responden 200', async ({ page }) => {
  test.setTimeout(300_000)
  for (const template of ['Concept', 'Loft']) {
    await createProjectViaUi(page, { name: `E2E barrido ${template} ${Date.now()}`, kind: template === 'Concept' ? 'comercio' : 'vivienda', template })
    await page.waitForTimeout(3000)
    await viewButton(page, '2D').click()
    await page.waitForTimeout(4000)
    const statuses = await planImageStatuses(page)
    expect(statuses.length, template).toBeGreaterThan(5)
    expect(statuses.filter((s) => s.status !== 200), template).toEqual([])
  }
})
