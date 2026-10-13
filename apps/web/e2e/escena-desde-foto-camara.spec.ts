import { type Page, expect, test } from '@playwright/test'
import { ANALYZE_URL, FOUR_PIECES_ANALYSIS, analyzePhoto, answerWith } from './support/analysis'
import { ready } from './support/editor'
import { hook } from './support/hooks'
import { PROJECT_URL } from './support/projects'

// La cámara 3D abre en el punto de vista de la foto: del lado del muro cercano (el de y = 1 del análisis, el sur), centrada, a la altura
// de los ojos, mirando hacia el muro opuesto y un poco hacia abajo, con 60° de campo de visión. La escena queda centrada en el origen
// (ambiente de 4 × 3 m: de -2 a 2 en x y de -1,5 a 1,5 en z, el sur en z = +1,5) y el piso está a 0,05 m: los ojos a 1,5 m son y = 1,55
// y el objetivo, a 0,7 m, y = 0,75. Las capturas (a 1280 px) quedan en test-results/escena-desde-foto/ para mirarlas; lo que se comprueba
// aquí es la pose y el campo de visión de la cámara, no los píxeles.
const SHOTS = 'test-results/escena-desde-foto'
const SESSION_KEY_PREFIX = 'madori:photo-camera:'

type Pose = { position: readonly number[]; target: readonly number[]; projection: string }
const gap = (a: readonly number[], b: readonly number[]) => Math.max(...a.map((n, i) => Math.abs(n - (b[i] ?? Number.POSITIVE_INFINITY))))

/** Qué tan lejos está la cámara que publica Pascal (la última pose asentada) de la esperada: el mayor desvío en metros. */
const gapTo = async (page: Page, expected: { position: number[]; target: number[] }) => {
  const pose = (await hook(page, 'cameraPose')) as Pose | null
  return pose ? Math.max(gap(pose.position, expected.position), gap(pose.target, expected.target)) : Number.POSITIVE_INFINITY
}

/** Espera a que la cámara llegue a la pose esperada (con el encuadre del shell y el de Pascal ya terminados) y la devuelve. */
async function expectPhotoPose(page: Page, expected: { position: number[]; target: number[] }) {
  await expect.poll(() => gapTo(page, expected), { timeout: 45_000, message: 'la cámara llega al punto de vista de la foto' }).toBeLessThan(0.05)
  return (await hook(page, 'cameraPose')) as Pose
}

/** Lo que dice la pose: la cámara está cerca del muro sur (z = +1,5), centrada, y mira hacia el norte, sin girar. */
function expectLooksFromNearWall(pose: Pose) {
  const [x = 0, y = 0, z = 0] = pose.position
  expect(pose.projection).toBe('perspective')
  expect(Math.abs(x), 'centrada').toBeLessThan(0.05)
  expect(z, 'adentro, junto al muro sur').toBeGreaterThan(0.9)
  expect(z).toBeLessThan(1.4)
  expect(y, 'altura de ojos').toBeCloseTo(1.55, 1)
  const dir = pose.target.map((n, i) => n - (pose.position[i] ?? 0))
  const length = Math.hypot(...dir)
  expect((dir[2] ?? 0) / length, 'mira hacia el norte').toBeLessThan(-0.85)
  expect(dir[1] ?? 0, 'y un poco hacia abajo').toBeLessThan(0)
  expect(Math.abs((dir[0] ?? 0) / length), 'derecho, sin girar').toBeLessThan(0.05)
}

/** La vista del editor es una que muestra el 3D, y la clave que la página dejó en sessionStorage ya se tomó (se aplica una sola vez). */
async function expect3dVisibleAndKeyTaken(page: Page) {
  const state = (await hook(page, 'state')) as { viewMode: string }
  expect(['3d', 'split']).toContain(state.viewMode)
  await expect(page.locator('[data-pascal-viewer-3d]').first()).toBeVisible()
  const keys = await page.evaluate((prefix) => Object.keys(sessionStorage).filter((key) => key.startsWith(prefix)), SESSION_KEY_PREFIX)
  expect(keys).toEqual([])
}

const PHOTO_FOV = 60
const SIN_ANCHO = { position: [0, 1.55, 1.2], target: [0, 0.75, -0.74] }

test.describe('la cámara 3D abre en el punto de vista de la foto', () => {
  test('«Abrir en el editor»: cerca del muro cercano, mirando al opuesto, y el encuadre automático no la pisa', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route(ANALYZE_URL, answerWith(FOUR_PIECES_ANALYSIS))
    await analyzePhoto(page)
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)

    const pose = await expectPhotoPose(page, SIN_ANCHO)
    expectLooksFromNearWall(pose)
    expect(await hook(page, 'cameraFov'), 'campo de visión de la foto').toBe(PHOTO_FOV)
    await expect3dVisibleAndKeyTaken(page)

    // El reintento del encuadre (hasta 18 s), el segundo cuadro del divisor y un cambio de tamaño de la ventana no la mueven.
    await page.waitForTimeout(6000) // texturas y modelos, y que pasen los reintentos
    await page.mouse.move(1270, 400) // el cursor no resalta nada
    await page.screenshot({ path: `${SHOTS}/camara-foto-1280.png` })
    await page.setViewportSize({ width: 1100, height: 760 })
    await page.waitForTimeout(2500)
    expect(await gapTo(page, SIN_ANCHO), 'tras cambiar el tamaño de la ventana').toBeLessThan(0.05)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(1500)
    expect(await gapTo(page, SIN_ANCHO), 'tras volver al tamaño').toBeLessThan(0.05)

    // Cuando la persona toca la cámara, la pose se suelta y el encuadre vuelve a ser el de siempre (la diagonal que cabe todo).
    await page.mouse.move(640, 420)
    await page.mouse.wheel(0, 240)
    await page.waitForTimeout(1500)
    await page.setViewportSize({ width: 1180, height: 780 })
    await expect.poll(() => gapTo(page, SIN_ANCHO), { timeout: 20_000, message: 'tras tocar la cámara, el encuadre automático vuelve' }).toBeGreaterThan(1)
    expect(await hook(page, 'cameraFov'), 'y con el campo de visión de la cámara del editor').toBe(50)
  })

  test('con el ancho conocido, el ambiente es más hondo y la cámara queda junto a su muro cercano', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route(ANALYZE_URL, answerWith(FOUR_PIECES_ANALYSIS))
    await analyzePhoto(page, '6') // 6 × 4,5 m: el muro sur está en z = +2,25
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    // El objetivo es el centro del ambiente (z = 0): a 1,95 m de la cámara, que es más de lo que piden los controles de Pascal.
    const pose = await expectPhotoPose(page, { position: [0, 1.55, 1.95], target: [0, 0.75, 0] })
    expect(pose.position[2]).toBeGreaterThan(1.5)
    expect(pose.position[2]).toBeLessThan(2.15)
    await expect3dVisibleAndKeyTaken(page)
  })

  test('«Probar con un ejemplo» abre con la misma cámara, sin llamar a la API', async ({ page }) => {
    test.setTimeout(240_000)
    let calledApi = false
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route(ANALYZE_URL, (route) => {
      calledApi = true
      return route.abort()
    })
    await page.goto('/escena-desde-foto')
    await page.getByRole('button', { name: 'Probar con un ejemplo' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    const pose = await expectPhotoPose(page, SIN_ANCHO)
    expectLooksFromNearWall(pose)
    await expect3dVisibleAndKeyTaken(page)
    await page.waitForTimeout(6000)
    await page.mouse.move(1270, 400)
    await page.screenshot({ path: `${SHOTS}/camara-ejemplo-1280.png` })
    expect(calledApi).toBe(false)
  })

  test('si el 3D estaba oculto (la persona había dejado solo el plano), el editor lo muestra', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    // La vista que Madori recuerda entre sesiones (view-storage.ts): solo el plano.
    await page.addInitScript(() => window.localStorage.setItem('madori-editor-view', '2d'))
    await page.route(ANALYZE_URL, answerWith(FOUR_PIECES_ANALYSIS))
    await analyzePhoto(page)
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    await expectPhotoPose(page, SIN_ANCHO)
    await expect3dVisibleAndKeyTaken(page)
  })

  test('si el guardado de la escena falla y se reintenta, la cámara de la foto llega igual al editor', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    let failedOnce = false
    await page.route('**/v1/projects/*/scene', (route) => {
      if (route.request().method() !== 'PUT' || failedOnce) return route.continue()
      failedOnce = true
      return route.abort('failed')
    })
    await page.route(ANALYZE_URL, answerWith(FOUR_PIECES_ANALYSIS))
    await analyzePhoto(page)
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()
    await expect(page.getByText('El proyecto se creó, pero no pudimos guardar la escena')).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: 'Reintentar guardar la escena' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    expectLooksFromNearWall(await expectPhotoPose(page, SIN_ANCHO))
    await expect3dVisibleAndKeyTaken(page)
  })

  test('lo que no viene de una foto (el Loft de prueba) abre con el encuadre de siempre', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/escena-desde-foto')
    await page.getByText('Comprobar que el camino al editor funciona').click()
    await page.getByRole('button', { name: 'Abrir el Loft como prueba' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    await page.waitForTimeout(8000) // el encuadre automático ya terminó
    expect(await gapTo(page, SIN_ANCHO), 'no es la cámara de la foto').toBeGreaterThan(1)
    await expect3dVisibleAndKeyTaken(page)
  })
})
