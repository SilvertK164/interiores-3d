import { type Page, expect, test } from '@playwright/test'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import { ANALYZE_URL, answerWith, gradientPng } from './support/analysis'
import { createAccount, signInViaUi } from './support/user'

// «Escena desde una foto» (/escena-desde-foto) con la interfaz propia: que se vea bien y se use bien en escritorio y en el celular.
// Las capturas quedan en test-results/escena-desde-foto/ para mirarlas; lo que se comprueba aquí son las reglas, no los píxeles.
const SCREENS = [
  { name: '1280', viewport: { width: 1280, height: 800 } },
  { name: '390', viewport: { width: 390, height: 844 } },
]
const SHOTS = 'test-results/escena-desde-foto'

/** Cuánto se sale la página de la pantalla a lo ancho: tiene que ser 0 (nada de desplazamiento horizontal). */
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

/** Controles visibles que miden menos de 44 px (la zona de la foto cuenta por su etiqueta, no por el `<input>` oculto). */
const smallTargets = (page: Page) =>
  page.evaluate(() => {
    const MIN = 44
    const small: string[] = []
    const selector = 'button, a[href], summary, input:not([type="file"]), label:has(input[type="file"])'
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      if (box.width < MIN - 0.5 || box.height < MIN - 0.5) {
        const name = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30) ?? ''
        small.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(box.width)}x${Math.round(box.height)}`)
      }
    }
    return small
  })

/**
 * Texto visible que no llega al contraste AA de WCAG (4,5:1; 3:1 si es grande). Compone los fondos translúcidos de las tarjetas de
 * vidrio sobre el fondo de la página; lo deshabilitado, lo que está a media opacidad y el texto solo para lectores quedan fuera.
 */
const contrastFailures = (page: Page) =>
  page.evaluate(() => {
    type Rgba = [number, number, number, number]
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
    // Cualquier color CSS (rgb, color-mix, oklab…) pasa por un canvas para obtener su sRGB.
    const parse = (css: string): Rgba => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = '#000'
      context.fillStyle = css
      context.fillRect(0, 0, 1, 1)
      const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data
      return [r, g, b, a / 255]
    }
    const over = (top: Rgba, bottom: [number, number, number]): [number, number, number] => [
      top[0] * top[3] + bottom[0] * (1 - top[3]),
      top[1] * top[3] + bottom[1] * (1 - top[3]),
      top[2] * top[3] + bottom[2] * (1 - top[3]),
    ]
    const luminance = ([r, g, b]: [number, number, number]) => {
      const lin = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    const base = parse(getComputedStyle(document.querySelector('.app-shell') ?? document.body).backgroundColor)
    const pageBg: [number, number, number] = [base[0], base[1], base[2]]
    const backgroundOf = (el: Element): [number, number, number] => {
      const layers: Rgba[] = []
      for (let node: Element | null = el; node; node = node.parentElement) {
        const layer = parse(getComputedStyle(node).backgroundColor)
        if (layer[3] > 0) layers.push(layer)
        if (layer[3] >= 1) break
      }
      return layers.reverse().reduce<[number, number, number]>((below, layer) => over(layer, below), pageBg)
    }
    const failures: string[] = []
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
      if (own.length === 0 || ['SCRIPT', 'STYLE', 'OPTION'].includes(el.tagName)) continue
      const box = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      if (box.width <= 1 || box.height <= 1 || style.visibility === 'hidden') continue
      if (el.closest(':disabled, [aria-disabled="true"], [aria-hidden="true"]')) continue
      let opacity = 1
      for (let node: Element | null = el; node; node = node.parentElement) opacity *= Number.parseFloat(getComputedStyle(node).opacity)
      if (opacity < 0.99) continue
      const fg = parse(style.color)
      const bg = backgroundOf(el)
      const text = over(fg, bg)
      const [light, dark] = [luminance(text), luminance(bg)].sort((a, b) => b - a) as [number, number]
      const ratio = (light + 0.05) / (dark + 0.05)
      const size = Number.parseFloat(style.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number.parseInt(style.fontWeight, 10) >= 700)
      if (ratio < (large ? 3 : 4.5)) failures.push(`«${own[0]?.textContent?.trim().slice(0, 40)}» ${ratio.toFixed(2)}:1 (${style.color} sobre ${bg.map(Math.round).join(',')})`)
    }
    return failures
  })

test.describe('diseño de /escena-desde-foto', () => {
  test('el verificador de contraste no pasa de largo: detecta gris claro sobre blanco y acepta la tinta de la marca', async ({ page }) => {
    await page.setContent(`
      <div class="app-shell" style="background:#eef2f8">
        <p style="color:#aaaaaa;background:#ffffff;font-size:14px">Texto casi invisible</p>
        <p style="color:#0b1f4d;font-size:14px">Texto con la tinta de la marca</p>
        <p style="color:#0b1f4d;background:rgb(255 255 255 / 0.62);font-size:14px">Texto sobre vidrio</p>
        <p style="color:#777777;background:#ffffff;font-size:26px">Texto grande con 4,4:1</p>
        <button disabled style="color:#cccccc;background:#fff">Deshabilitado, queda fuera</button>
      </div>`)
    const failures = await contrastFailures(page)
    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain('Texto casi invisible')
  })

  for (const screen of SCREENS) {
    test(`${screen.name} px: el texto cumple el contraste AA (WCAG) en cada paso`, async ({ page }) => {
      await page.setViewportSize(screen.viewport)
      await page.route(ANALYZE_URL, answerWith(SAMPLE_ANALYSIS))
      await page.goto('/escena-desde-foto')
      await expect(page.getByRole('heading', { name: 'Escena desde una foto', level: 1 })).toBeVisible()
      expect(await contrastFailures(page), 'sin foto').toEqual([])

      await page.getByLabel('Foto del ambiente').setInputFiles({ name: 'sala.png', mimeType: 'image/png', buffer: gradientPng(300, 200) })
      await page.getByRole('button', { name: 'Analizar foto' }).click()
      await expect(page.getByRole('heading', { name: 'Muebles encontrados' })).toBeVisible({ timeout: 30_000 })
      await page.getByText('Ver la respuesta completa (JSON)').click()
      await page.getByText('Comprobar que el camino al editor funciona').click()
      expect(await contrastFailures(page), 'con resultados y los desplegables abiertos').toEqual([])
    })
  }

  for (const screen of SCREENS) {
    test(`${screen.name} px: sin desplazamiento horizontal, objetivos táctiles de 44 px y la maqueta de cada paso`, async ({ page }) => {
      await page.setViewportSize(screen.viewport)
      await page.route(ANALYZE_URL, answerWith(SAMPLE_ANALYSIS))
      await page.goto('/escena-desde-foto')

      // Paso 1: sin foto. Título, subtítulo, las dos tarjetas y la herramienta plegada.
      await expect(page.getByRole('heading', { name: 'Escena desde una foto', level: 1 })).toBeVisible()
      await expect(page.getByText('qué muebles del catálogo hay y dónde')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Tu foto' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Resultado', exact: true })).toBeVisible()
      await expect(page.getByText(/Google puede usar las fotos para mejorar sus productos/)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Analizar foto' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Probar con un ejemplo' })).toBeVisible()
      await expect(page.getByLabel(/Dirección del servicio/)).toHaveCount(0)
      await expect(page.getByText('Abrir el Loft como prueba')).toBeHidden() // plegado, discreto
      expect(await overflow(page)).toBeLessThanOrEqual(0)
      expect(await smallTargets(page)).toEqual([])
      await page.screenshot({ path: `${SHOTS}/${screen.name}-1-vacio.png`, fullPage: true })

      // Paso 2: foto elegida, con su vista previa y su peso.
      await page.getByLabel('Foto del ambiente').setInputFiles({ name: 'sala-de-estar.png', mimeType: 'image/png', buffer: gradientPng(1200, 800) })
      await expect(page.getByAltText('Vista previa de la foto elegida')).toBeVisible()
      await expect(page.getByText('sala-de-estar.png')).toBeVisible()
      expect(await overflow(page)).toBeLessThanOrEqual(0)
      await page.screenshot({ path: `${SHOTS}/${screen.name}-2-foto.png`, fullPage: true })

      // Paso 3: resultado en la segunda tarjeta.
      await page.getByLabel('Ancho conocido').fill('4,5')
      await page.getByRole('button', { name: 'Analizar foto' }).click()
      await expect(page.getByRole('heading', { name: 'Muebles encontrados' })).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('9 piezas')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Crear escena y abrir en el editor' })).toBeVisible()
      expect(await overflow(page)).toBeLessThanOrEqual(0)
      expect(await smallTargets(page)).toEqual([])
      await page.screenshot({ path: `${SHOTS}/${screen.name}-3-resultado.png`, fullPage: true })

      // Paso 4: los dos desplegables abiertos tampoco desbordan.
      await page.getByText('Ver la respuesta completa (JSON)').click()
      await page.getByText('Comprobar que el camino al editor funciona').click()
      await expect(page.getByRole('button', { name: 'Abrir el Loft como prueba' })).toBeVisible()
      expect(await overflow(page)).toBeLessThanOrEqual(0)
      expect(await smallTargets(page)).toEqual([])
      await page.screenshot({ path: `${SHOTS}/${screen.name}-4-desplegables.png`, fullPage: true })
    })
  }

  test('con teclado se llega a la zona de la foto y se ve dónde está el foco', async ({ page }) => {
    await page.goto('/escena-desde-foto')
    await expect(page.getByRole('heading', { name: 'Escena desde una foto', level: 1 })).toBeVisible()
    let onPhoto = false
    for (let presses = 0; presses < 12 && !onPhoto; presses++) {
      await page.keyboard.press('Tab')
      onPhoto = await page.evaluate(() => document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'file')
    }
    expect(onPhoto).toBe(true)
    const ring = await page.evaluate(() => {
      const zone = document.activeElement?.closest('label')
      const style = zone ? getComputedStyle(zone) : null
      return { style: style?.outlineStyle, width: Number.parseFloat(style?.outlineWidth ?? '0') }
    })
    expect(ring.style).toBe('solid')
    expect(ring.width).toBeGreaterThanOrEqual(2)
  })

  test('arrastrar y soltar una foto la elige; otro tipo de archivo se ignora', async ({ page }) => {
    await page.goto('/escena-desde-foto')
    const zone = page.locator('label:has(input[type="file"])')
    const drop = (name: string, type: string, buffer: Buffer) =>
      zone.evaluate(
        (el, { name, type, bytes }) => {
          const data = new DataTransfer()
          data.items.add(new File([new Uint8Array(bytes)], name, { type }))
          el.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }))
        },
        { name, type, bytes: [...buffer] },
      )
    await drop('notas.txt', 'text/plain', Buffer.from('no soy una foto'))
    await expect(page.getByAltText('Vista previa de la foto elegida')).toHaveCount(0)
    await drop('sala.png', 'image/png', gradientPng(40, 30))
    await expect(page.getByAltText('Vista previa de la foto elegida')).toBeVisible()
    await expect(page.getByText('sala.png')).toBeVisible()
  })

  test('mientras se analiza se ve el Loader compacto (no un texto de carga) y los botones quedan quietos', async ({ page }) => {
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route(ANALYZE_URL, async (route) => {
      await gate
      return answerWith(SAMPLE_ANALYSIS)(route)
    })
    await page.goto('/escena-desde-foto')
    await page.getByLabel('Foto del ambiente').setInputFiles({ name: 'sala.png', mimeType: 'image/png', buffer: gradientPng(60, 40) })
    await page.getByRole('button', { name: 'Analizar foto' }).click()
    const loader = page.getByRole('status').filter({ hasText: 'Analizando tu foto' })
    await expect(loader).toBeVisible()
    await expect(loader.locator('svg')).toHaveCount(1)
    await expect(page.getByText(/Cargando/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Analizar foto' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Probar con un ejemplo' })).toBeDisabled()
    release()
    await expect(page.getByRole('heading', { name: 'Muebles encontrados' })).toBeVisible({ timeout: 30_000 })
    await expect(loader).toHaveCount(0)
  })
})

// Salir cierra la sesión del navegador (y la del servidor): estas pruebas usan una cuenta propia para no dejar sin sesión a las demás.
test.describe('cabecera de la interfaz propia', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('«Escena desde una foto» queda marcada como la página actual, «Mis proyectos» vuelve a la lista y Salir lleva a /login sin avisar que la sesión venció', async ({ page }) => {
    const account = await createAccount()
    await signInViaUi(page, account)

    // Desde /proyectos a la escena desde una foto y de vuelta.
    await page.getByRole('link', { name: 'Escena desde una foto', exact: true }).click()
    await page.waitForURL('**/escena-desde-foto')
    await expect(page.getByRole('heading', { name: 'Escena desde una foto', level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Escena desde una foto', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('searchbox')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Nuevo proyecto' })).toHaveCount(0)
    await page.getByRole('link', { name: 'Mis proyectos' }).click()
    await page.waitForURL('**/proyectos')
    await expect(page.getByRole('searchbox', { name: 'Buscar proyectos y plantillas' })).toBeVisible()

    // Salir desde /proyectos.
    await page.getByRole('button', { name: 'Salir' }).click()
    await page.waitForURL(/\/login/)
    expect(new URL(page.url()).search).not.toContain('motivo')

    // Y desde «Escena desde una foto».
    await signInViaUi(page, account)
    await page.goto('/escena-desde-foto')
    await expect(page.getByRole('heading', { name: 'Escena desde una foto', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: 'Salir' }).click()
    await page.waitForURL(/\/login/)
    expect(new URL(page.url()).search).not.toContain('motivo')
  })
})
