import { type Page, expect, test } from '@playwright/test'
import { templateById } from '../src/lib/templates'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { dock, viewButton } from './support/shell'

/** Cómo se ve el plano 2D: su encuadre (viewBox) y su giro en grados (0 = norte arriba), leídos del SVG de Pascal. */
const plan = (page: Page) =>
  page.evaluate(() => {
    const scene = document.querySelector('[data-floorplan-scene]') as SVGGElement | null
    const svg = scene?.ownerSVGElement
    const match = /rotate\((-?[\d.]+)/.exec(scene?.getAttribute('transform') ?? '')
    const box = (svg?.getAttribute('viewBox') ?? '').split(' ').map(Number)
    return { box, rotation: scene ? (match ? Number(match[1]) : 0) : Number.NaN, rect: svg ? (({ x, y, width, height }) => ({ x, y, width, height }))(svg.getBoundingClientRect()) : null }
  })
const camera = async (page: Page) => (await hook(page, 'cameraPose')) as { position: number[]; target: number[]; viewWidth?: number } | null
const near = (a: number[], b: number[], eps = 1e-3) => a.length === b.length && a.every((v, i) => Math.abs(v - (b[i] ?? 0)) < eps)

async function openSplit(page: Page) {
  const store = templateById('concept-store') ?? templateById('loft')
  if (!store) throw new Error('Falta una plantilla')
  await createProjectViaUi(page, { name: `E2E vistas ${Date.now()}`, kind: store.kind, template: store.name })
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  await viewButton(page, 'Ambas').click()
  await expect.poll(async () => (await plan(page)).box.length, { timeout: 15_000 }).toBe(4)
  await expect.poll(() => camera(page), { timeout: 15_000 }).not.toBeNull()
  await page.waitForTimeout(2000)
}

test('Ambas: orbitar y acercar el 3D no cambia el encuadre ni el giro del plano, y el plano arranca con el norte arriba', async ({ page }) => {
  test.setTimeout(180_000)
  await openSplit(page)
  const before = await plan(page)
  expect(Math.abs(before.rotation)).toBeLessThan(0.5)
  const cam = (await camera(page)) as NonNullable<Awaited<ReturnType<typeof camera>>>
  // Una pose distinta: otro lado de la planta, más cerca y con otro centro.
  await hook(page, 'setCameraPose', { position: [-6, 5, 2], target: [1, 0, 1], viewWidth: 6 })
  await expect.poll(async () => near((await camera(page))?.position ?? [], cam.position, 0.5)).toBe(false)
  for (let i = 0; i < 2; i++) {
    await hook(page, 'orbit', 'cw')
    await page.waitForTimeout(1500)
  }
  const after = await plan(page)
  expect(after.rotation).toBe(before.rotation)
  expect(after.box).toEqual(before.box)
  await viewButton(page, '2D').click()
  await page.waitForTimeout(1500)
  const alone = await plan(page)
  expect(Math.abs(alone.rotation)).toBeLessThan(0.5)
})

test('Ambas: hacer zoom y paneo en el plano no mueve la cámara 3D', async ({ page }) => {
  test.setTimeout(180_000)
  await openSplit(page)
  const before = await plan(page)
  const cam = (await camera(page)) as NonNullable<Awaited<ReturnType<typeof camera>>>
  const rect = before.rect as { x: number; y: number; width: number; height: number }
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  await page.mouse.move(cx, cy)
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -300)
    await page.waitForTimeout(250)
  }
  await expect.poll(async () => (await plan(page)).box[2]).not.toBe(before.box[2])
  const moved = await camera(page)
  expect(near(moved?.position ?? [], cam.position)).toBe(true)
  expect(near(moved?.target ?? [], cam.target)).toBe(true)
  expect(moved?.viewWidth).toBeCloseTo(cam.viewWidth ?? 0, 3)
})

test('Ambas: Recorrer solo mueve la cámara del 3D; el plano no se mueve ni gira', async ({ page }) => {
  test.setTimeout(180_000)
  await openSplit(page)
  const before = await plan(page)
  const levelId = ((await hook(page, 'levels'))[0] as { id: string }).id
  expect(await hook(page, 'walkAt', levelId, 0, 0, 0)).toBe(true)
  await page.waitForTimeout(2500)
  const start = await hook(page, 'walkEye', levelId)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(4000)
  await page.keyboard.up('KeyW')
  const end = await hook(page, 'walkEye', levelId)
  expect(Math.hypot((end?.x ?? 0) - (start?.x ?? 0), (end?.z ?? 0) - (start?.z ?? 0))).toBeGreaterThan(0.2)
  // Durante el recorrido Pascal oculta los paneles: el plano se compara al volver.
  await hook(page, 'walkStop')
  await expect.poll(async () => (await plan(page)).box.length, { timeout: 15_000 }).toBe(4)
  await page.waitForTimeout(1500)
  const after = await plan(page)
  expect(after.rotation).toBe(before.rotation)
  expect(after.box).toEqual(before.box)
})

test('Ambas: lo que se edita en una vista se ve en la otra', async ({ page }) => {
  test.setTimeout(180_000)
  await openSplit(page)
  const id = (await hook(page, 'addItem')) as string
  await expect.poll(() => hook(page, 'has3d', id)).toBe(true)
  await expect.poll(() => page.evaluate((nodeId) => Boolean(document.querySelector(`[data-floorplan-scene] [data-node-id="${nodeId}"]`)), id)).toBe(true)
  const spot = () => page.evaluate((nodeId) => {
    const el = document.querySelector(`[data-floorplan-scene] [data-node-id="${nodeId}"]`)
    const r = el?.getBoundingClientRect()
    return r ? [Math.round(r.x), Math.round(r.y)] : null
  }, id)
  const was = await spot()
  await hook(page, 'moveNode', id, [3, 0, 3])
  await expect.poll(spot).not.toEqual(was)
})

test('Ambas: cada vista se encuadra a la planta completa sin quedar bajo los paneles', async ({ page }) => {
  test.setTimeout(180_000)
  await openSplit(page)
  await page.waitForTimeout(2500)
  const boxes = await page.evaluate(() => {
    const r = (el: Element | null | undefined) => {
      const b = el?.getBoundingClientRect()
      return b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null
    }
    const scene = document.querySelector('[data-floorplan-scene]') as SVGGElement | null
    // Las paredes y muebles del nivel activo (el fondo y la cuadrícula del plano no cuentan).
    const content = scene?.querySelector('[data-node-id]')?.parentElement
    return {
      svg: r(scene?.ownerSVGElement),
      content: r(content),
      left: r(document.querySelector('[data-frame-panel="left"]')),
      bottom: r(document.querySelector('[data-frame-panel="bottom"]')),
    }
  })
  const { svg, content, left, bottom } = boxes as Record<string, { x: number; y: number; w: number; h: number } | null>
  expect(svg && content && left && bottom).toBeTruthy()
  const c = content as { x: number; y: number; w: number; h: number }
  const l = left as { x: number; y: number; w: number; h: number }
  const b = bottom as { x: number; y: number; w: number; h: number }
  const s = svg as { x: number; y: number; w: number; h: number }
  // Entra completa en el lienzo...
  expect(c.x).toBeGreaterThanOrEqual(s.x - 1)
  expect(c.x + c.w).toBeLessThanOrEqual(s.x + s.w + 1)
  expect(c.y).toBeGreaterThanOrEqual(s.y - 1)
  expect(c.y + c.h).toBeLessThanOrEqual(s.y + s.h + 1)
  // ...y ni el panel de plantas ni el dock la tapan.
  expect(c.x).toBeGreaterThanOrEqual(l.x + l.w - 1)
  expect(c.y + c.h).toBeLessThanOrEqual(b.y + 1)
  // Y llena una parte razonable de la zona libre (no queda chica en una esquina).
  expect(c.w).toBeGreaterThan((s.w - (l.x + l.w - s.x)) * 0.5)
})
