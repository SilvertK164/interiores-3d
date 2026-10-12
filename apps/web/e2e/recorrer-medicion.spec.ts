import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { modeButton } from './support/shell'

/**
 * Medición de Recorrer en ejecución (Loft de 12 × 7 m, ventana sin puntero bloqueado: el movimiento va por teclado).
 * Las plantillas se guardan centradas en el origen: coordenadas de la plantilla (x, z) -> (x - 6, z - 3,5).
 * El render por software va lento (~0,25 m/s), por eso los tiempos son largos.
 */
const T = (x: number, z: number): [number, number] => [x - 6, z - 3.5]
const YAW = { norte: 0, este: -Math.PI / 2 } as const

const eye = (page: Page, levelId: string) => hook(page, 'walkEye', levelId)
const start = async (page: Page, levelId: string, at: [number, number], yaw: number) => {
  await hook(page, 'walkAt', levelId, at[0], at[1], yaw)
  await page.waitForTimeout(2500)
}
/** Mantiene W durante `seconds` y devuelve la posición de cada segundo (x, z y altura sobre el piso). */
async function walk(page: Page, levelId: string, seconds: number, onSecond?: (second: number) => Promise<void>) {
  const trace: { x: number; z: number; y: number }[] = []
  await page.keyboard.down('KeyW')
  for (let i = 0; i < seconds; i++) {
    await page.waitForTimeout(1000)
    await onSecond?.(i)
    const e = await eye(page, levelId)
    trace.push({ x: e?.lx ?? Number.NaN, z: e?.lz ?? Number.NaN, y: e?.ly ?? Number.NaN })
  }
  await page.keyboard.up('KeyW')
  return trace
}

test('Recorrer: empieza dentro, avanza, choca con los muros, la puerta cerrada bloquea y abierta deja pasar, y sube la escalera', async ({ page }) => {
  test.setTimeout(420_000)
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text().slice(0, 200)}`)
  })
  await createProjectViaUi(page, { name: `E2E recorrer medicion ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  await page.waitForTimeout(3000)
  await modeButton(page, 'Ver').click()
  const ground = (await hook(page, 'levels'))[0]?.id as string

  // 1. Empieza dentro del ambiente más grande (el salón), no afuera.
  await page.getByRole('toolbar', { name: 'Cámara' }).getByRole('button', { name: 'Recorrer' }).click()
  await expect.poll(async () => (await hook(page, 'state')).firstPerson, { timeout: 15_000 }).toBe(true)
  await page.waitForTimeout(3000)
  const first = await eye(page, ground)
  expect(first?.zone).toBe('Cocina, comedor y estar')
  expect(first?.lx).toBeGreaterThan(-6)
  expect(first?.lx).toBeLessThan(2.5)
  expect(first?.lz).toBeGreaterThan(-3.5)
  expect(first?.lz).toBeLessThan(3.5)
  await expect(page.getByText('Place a spawn point')).toHaveCount(0)
  await hook(page, 'walkStop')
  await page.waitForTimeout(800)

  // 2 y 3. Avanza y se detiene ante el muro norte (a 0,36 m del eje: el radio del cuerpo).
  await start(page, ground, T(6.1, 2.0), YAW.norte)
  const north = await walk(page, ground, 12)
  expect(north[0]?.z).toBeLessThan(-1.4)
  const lastNorth = north.at(-1)?.z ?? 0
  expect(lastNorth).toBeLessThan((north[0]?.z ?? 0) - 0.5) // avanzó
  expect(lastNorth).toBeGreaterThan(-3.5) // no atravesó el muro (z = -3,5)
  await hook(page, 'walkStop')
  await page.waitForTimeout(800)

  // 4. La puerta del baño (cerrada) bloquea; al abrirla con E se atraviesa su hueco.
  await start(page, ground, T(7.2, 1.5), YAW.este)
  const door = await walk(page, ground, 24, async (second) => {
    if (second === 8) await page.keyboard.press('KeyE')
  })
  expect(door[7]?.x).toBeLessThan(2.5) // cerrada: se detiene en la hoja (x = 2,5)
  expect(door.at(-1)?.x).toBeGreaterThan(3.0) // abierta: pasó al baño
  await hook(page, 'walkStop')
  await page.waitForTimeout(800)

  // 5. Sube la escalera hasta la planta alta (3,6 m de piso a piso).
  await start(page, ground, T(4.0, 6.2), YAW.este)
  const stairs = await walk(page, ground, 25)
  expect(stairs.at(-1)?.y).toBeGreaterThan(3.2)
  await hook(page, 'walkStop')

  expect(problems.filter((p) => !/BVH|WebGPU|adapter|THREE\.Clock/.test(p)), problems.join('\n')).toEqual([])
})
