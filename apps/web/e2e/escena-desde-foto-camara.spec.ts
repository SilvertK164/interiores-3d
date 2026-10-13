import { type Page, expect, test } from '@playwright/test'
import { ANALYZE_URL, CORNER_ANALYSIS, HALL_ANALYSIS, analyzePhoto, answerWith } from './support/analysis'
import { ready } from './support/editor'
import { hook } from './support/hooks'
import { PROJECT_URL } from './support/projects'

// La cámara 3D abre en el punto de vista de la foto: donde estaba quien la sacó (la posición del plano: dentro del ambiente, en una esquina o
// apenas afuera de un muro; si está pegada a un muro se corre adentro 0,3 m del eje para que no tape la vista), a la altura de los ojos y mirando
// hacia el punto del plano que dio el análisis, un poco hacia abajo, con el campo de visión de la foto (60° por defecto). La escena queda centrada
// en el origen y el piso está a 0,05 m: los ojos a 1,5 m son y = 1,55 y el objetivo, a 0,7 m, y = 0,75. Con el salón de 3,2 × 7 m (de -1,6 a 1,6 en
// x y de -3,5 a 3,5 en z) y la cámara en el extremo sur, la cámara queda en (0; 1,55; 3,2) y el objetivo, a 4,5 m (lo más lejos que dejan los
// controles de Pascal), en (0; 0,75; -1,3). Las capturas (a 1280 px) quedan en test-results/escena-desde-foto/ para mirarlas; lo que se comprueba aquí
// es la pose y el campo de visión de la cámara, no los píxeles.
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

/** Lo que dice la pose del salón o del ejemplo: la cámara está cerca del muro sur (z = +`halfDepth`), centrada, y mira hacia el norte, sin girar. */
function expectLooksFromNearWall(pose: Pose, halfDepth: number) {
  const [x = 0, y = 0, z = 0] = pose.position
  expect(pose.projection).toBe('perspective')
  expect(Math.abs(x), 'centrada').toBeLessThan(0.05)
  expect(z, 'adentro, junto al muro sur').toBeGreaterThan(halfDepth - 0.7)
  expect(z).toBeLessThan(halfDepth - 0.1)
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
/** El salón de 3,2 × 7 m (HALL_ANALYSIS): cámara en el extremo sur, a 0,3 m del muro, mirando al norte con el objetivo a 4,5 m. */
const HALL_POSE = { position: [0, 1.55, 3.2], target: [0, 0.75, -1.3] }
/** El análisis de ejemplo (5 × 4,4 m): cámara a 0,3 m del muro sur, mirando al norte hasta el muro del fondo. */
const SAMPLE_POSE = { position: [0, 1.55, 1.9], target: [0, 0.75, -2.2] }
/** La foto desde la esquina sureste (fuera del rectángulo por 0,4 m en los dos ejes): se corre a 0,3 m de los dos muros y mira en diagonal al noroeste. */
const CORNER_POSE = { position: [2.2, 1.55, 1.7], target: [-1.379, 0.75, -1.027] }

test.describe('la cámara 3D abre en el punto de vista de la foto', () => {
  test('«Abrir en el editor»: en el extremo del salón donde se tomó la foto, mirando hacia el fondo, y el encuadre automático no la pisa', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route(ANALYZE_URL, answerWith(HALL_ANALYSIS))
    await analyzePhoto(page)
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)

    const pose = await expectPhotoPose(page, HALL_POSE)
    expectLooksFromNearWall(pose, 3.5)
    expect(await hook(page, 'cameraFov'), 'campo de visión de la foto').toBe(PHOTO_FOV)
    await expect3dVisibleAndKeyTaken(page)

    // El reintento del encuadre (hasta 18 s), el segundo cuadro del divisor y un cambio de tamaño de la ventana no la mueven.
    await page.waitForTimeout(6000) // texturas y modelos, y que pasen los reintentos
    await page.mouse.move(1270, 400) // el cursor no resalta nada
    await page.screenshot({ path: `${SHOTS}/camara-foto-1280.png` })
    await page.setViewportSize({ width: 1100, height: 760 })
    await page.waitForTimeout(2500)
    expect(await gapTo(page, HALL_POSE), 'tras cambiar el tamaño de la ventana').toBeLessThan(0.05)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(1500)
    expect(await gapTo(page, HALL_POSE), 'tras volver al tamaño').toBeLessThan(0.05)

    // Cuando la persona toca la cámara, la pose se suelta y el encuadre vuelve a ser el de siempre (la diagonal que cabe todo).
    await page.mouse.move(640, 420)
    await page.mouse.wheel(0, 240)
    await page.waitForTimeout(1500)
    await page.setViewportSize({ width: 1180, height: 780 })
    await expect.poll(() => gapTo(page, HALL_POSE), { timeout: 20_000, message: 'tras tocar la cámara, el encuadre automático vuelve' }).toBeGreaterThan(1)
    await expect.poll(() => hook(page, 'cameraFov'), { timeout: 20_000, message: 'y con el campo de visión de la cámara del editor' }).toBe(50)
  })

  test('una foto tomada desde una esquina (afuera del rectángulo): la cámara se corre adentro, mira en diagonal y usa el campo de visión de la foto', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route(ANALYZE_URL, answerWith(CORNER_ANALYSIS))
    await analyzePhoto(page)
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    // La foto estaba en (5,4; 4,4) de un ambiente de 5 × 4 m: la cámara queda en (4,7; 3,7) del plano, a 0,3 m de los muros sur y este, y mira hacia (0,5; 0,5).
    const pose = await expectPhotoPose(page, CORNER_POSE)
    const dir = pose.target.map((n, i) => n - (pose.position[i] ?? 0))
    expect(dir[0] ?? 0, 'mira al oeste').toBeLessThan(-1)
    expect(dir[2] ?? 0, 'y al norte').toBeLessThan(-1)
    expect(await hook(page, 'cameraFov'), 'campo de visión que dio el análisis').toBe(70)
    await expect3dVisibleAndKeyTaken(page)
    await page.waitForTimeout(6000)
    await page.mouse.move(1270, 400)
    await page.screenshot({ path: `${SHOTS}/camara-esquina-1280.png` })
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
    const pose = await expectPhotoPose(page, SAMPLE_POSE)
    expectLooksFromNearWall(pose, 2.2)
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
    await page.route(ANALYZE_URL, answerWith(HALL_ANALYSIS))
    await analyzePhoto(page)
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    await expectPhotoPose(page, HALL_POSE)
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
    await page.route(ANALYZE_URL, answerWith(HALL_ANALYSIS))
    await analyzePhoto(page)
    await page.getByRole('button', { name: 'Abrir en el editor' }).click()
    await expect(page.getByText('El proyecto se creó, pero no pudimos guardar la escena')).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: 'Reintentar guardar la escena' }).click()
    await page.waitForURL(PROJECT_URL, { timeout: 90_000 })
    await ready(page)
    expectLooksFromNearWall(await expectPhotoPose(page, HALL_POSE), 3.5)
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
    expect(await gapTo(page, HALL_POSE), 'no es la cámara de la foto').toBeGreaterThan(1)
    await expect3dVisibleAndKeyTaken(page)
  })
})
