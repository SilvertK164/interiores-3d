import { type Page, expect, test } from '@playwright/test'
import { blockNonLocalSignups, createAccount, gotoLogin, newAccount, signInViaUi, submitLogin, waitForHydration } from './support/user'

// Aquí se prueba el ACCESO: ninguna prueba arranca con la sesión del setup. Las que necesitan una cuenta la crean con
// el servicio local (createAccount) o, solo si prueban el registro, por la interfaz y contra Supabase local.
test.use({ storageState: { cookies: [], origins: [] } })

const BASE_ORIGIN = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000').origin
const SESSION_NOTICE = 'Tu sesión venció. Vuelve a ingresar y seguimos donde lo dejaste.'
const CREDENTIALS = 'El correo o la contraseña no coinciden'

const password = (page: Page) => page.getByLabel('Contraseña', { exact: true })

test.describe('pestañas y formularios', () => {
  test('Ingresar y Crear cuenta se cambian con clic y con el teclado, y ?modo=crear abre el registro', async ({ page }) => {
    await gotoLogin(page)
    const login = page.getByRole('tab', { name: 'Ingresar' })
    const register = page.getByRole('tab', { name: 'Crear cuenta' })
    await expect(page.getByRole('tablist', { name: 'Acceso a tu cuenta' })).toBeVisible()
    await expect(login).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { level: 1, name: 'Te damos la bienvenida' })).toBeVisible()

    await register.click()
    await expect(register).toHaveAttribute('aria-selected', 'true')
    await expect(login).toHaveAttribute('aria-selected', 'false')
    await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeVisible()
    await expect(page.getByLabel('¿Cómo te llamamos?')).toBeVisible()

    // Con el foco en la pestaña, las flechas pasan a la otra pestaña y le llevan el foco; Inicio y Fin van a los extremos.
    await register.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(login).toHaveAttribute('aria-selected', 'true')
    await expect(login).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(register).toHaveAttribute('aria-selected', 'true')
    await expect(register).toBeFocused()
    await page.keyboard.press('Home')
    await expect(login).toHaveAttribute('aria-selected', 'true')

    await gotoLogin(page, '?modo=crear')
    await expect(page.getByRole('tab', { name: 'Crear cuenta' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeVisible()
  })

  test('el correo escrito se conserva al cambiar de pestaña; la contraseña no', async ({ page }) => {
    await gotoLogin(page)
    await page.getByLabel('Correo').fill('ana@correo.com')
    await password(page).fill('una-clave')
    await page.getByRole('tab', { name: 'Crear cuenta' }).click()
    await expect(page.getByLabel('Correo')).toHaveValue('ana@correo.com')
    await expect(password(page)).toHaveValue('')
  })

  test('cada campo lleva el autocompletado que corresponde', async ({ page }) => {
    await gotoLogin(page)
    await expect(page.getByLabel('Correo')).toHaveAttribute('autocomplete', 'email')
    await expect(password(page)).toHaveAttribute('autocomplete', 'current-password')
    await page.getByRole('tab', { name: 'Crear cuenta' }).click()
    await expect(page.getByLabel('¿Cómo te llamamos?')).toHaveAttribute('autocomplete', 'name')
    await expect(page.getByLabel('Correo')).toHaveAttribute('autocomplete', 'email')
    await expect(password(page)).toHaveAttribute('autocomplete', 'new-password')
  })

  test('al enviar vacío se marcan los campos, se anuncian los errores y el foco va al primero', async ({ page }) => {
    await gotoLogin(page, '?modo=crear')
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
    const name = page.getByLabel('¿Cómo te llamamos?')
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(name).toBeFocused()
    await expect(page.getByRole('alert').filter({ hasText: 'Escribe cómo te llamamos.' })).toBeVisible()
    await expect(page.getByLabel('Correo')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert').filter({ hasText: 'Escribe tu correo.' })).toBeVisible()
    await expect(password(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert').filter({ hasText: 'Elige una contraseña.' })).toBeVisible()
    await expect(page).toHaveURL(/\/login/)

    // El error se va en cuanto el campo se corrige.
    await name.fill('Aea')
    await expect(name).not.toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert').filter({ hasText: 'Escribe cómo te llamamos.' })).toHaveCount(0)
  })

  test('el nombre pide de 2 a 40 caracteres tras recortar los espacios', async ({ page }) => {
    await gotoLogin(page, '?modo=crear')
    const name = page.getByLabel('¿Cómo te llamamos?')
    await name.fill('   A   ')
    await name.blur()
    await expect(page.getByRole('alert').filter({ hasText: 'Tu nombre necesita al menos 2 caracteres.' })).toBeVisible()
    await name.fill('x'.repeat(41))
    await expect(page.getByRole('alert').filter({ hasText: 'Usa 40 caracteres o menos.' })).toBeVisible()
    await name.fill('  Aea  ')
    await expect(name).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('al salir de un campo se valida en línea y el error queda enlazado con aria-describedby', async ({ page }) => {
    await gotoLogin(page)
    const email = page.getByLabel('Correo')
    await email.fill('esto-no-es-un-correo')
    await email.blur()
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa el correo' })).toBeVisible()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAttribute('aria-describedby', /.+/)
    await email.fill('ana@correo.com')
    await expect(email).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('la contraseña se puede ver y ocultar, y el medidor dice su fuerza con texto', async ({ page }) => {
    await gotoLogin(page, '?modo=crear')
    const field = password(page)
    const toggle = page.getByRole('button', { name: 'Mostrar contraseña' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(field).toHaveAttribute('type', 'password')

    await field.fill('abc')
    await expect(page.getByText('Débil', { exact: true })).toBeVisible()
    await field.fill('abcde1')
    await expect(page.getByText('Aceptable', { exact: true })).toBeVisible()
    await field.fill('Abcdefg1xy')
    await expect(page.getByText('Buena', { exact: true })).toBeVisible()

    await toggle.click()
    await expect(field).toHaveAttribute('type', 'text')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(field).toHaveValue('Abcdefg1xy')
    await toggle.click()
    await expect(field).toHaveAttribute('type', 'password')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  test('en escritorio la pantalla de acceso cabe sin scroll, también con todos los errores a la vista', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 720 })
    await gotoLogin(page)
    const overflow = () => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
    await expect.poll(overflow).toBeLessThanOrEqual(0)
    await page.getByRole('tab', { name: 'Crear cuenta' }).click()
    await expect.poll(overflow).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Elige una contraseña.' })).toBeVisible()
    await expect.poll(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('mensajes que explican', () => {
  test('una contraseña equivocada dice qué pasó y no revela si el correo existe', async ({ page }) => {
    const account = await createAccount()
    await gotoLogin(page)
    await submitLogin(page, { email: account.email, password: 'no-es-la-clave' })
    const banner = page.getByRole('alert').filter({ hasText: CREDENTIALS })
    await expect(banner).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
    // El foco vuelve a la contraseña para reintentar.
    await expect(password(page)).toBeFocused()

    // Un correo que no existe recibe exactamente el mismo mensaje.
    const message = await banner.innerText()
    await page.getByLabel('Correo').fill(`no-existe-${Date.now()}@example.com`)
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: CREDENTIALS })).toHaveText(message)
  })

  test('crear cuenta con un correo que ya existe ofrece ingresar con esa cuenta, con el correo ya escrito', async ({ page }) => {
    await blockNonLocalSignups(page)
    const account = await createAccount()
    await gotoLogin(page, '?modo=crear')
    await page.getByLabel('¿Cómo te llamamos?').fill('Repetida')
    await page.getByLabel('Correo').fill(account.email)
    await password(page).fill(newAccount().password)
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click()

    const banner = page.getByRole('alert').filter({ hasText: 'Ya existe una cuenta con ese correo.' })
    await expect(banner).toBeVisible()
    await expect(page.getByLabel('Correo')).toBeFocused()
    await banner.getByRole('button', { name: 'Ingresar con esa cuenta' }).click()

    await expect(page.getByRole('tab', { name: 'Ingresar' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByLabel('Correo')).toHaveValue(account.email)
    await expect(password(page)).toBeFocused()
    await password(page).fill(account.password)
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
    await page.waitForURL('**/proyectos')
  })
})

test.describe('volver a donde ibas', () => {
  test('una ruta protegida sin sesión manda a ingresar y, al ingresar, vuelve a ella (y abre el diálogo pedido)', async ({ page }) => {
    const account = await createAccount()
    await page.goto('/proyectos?nuevo=vivienda')
    await page.waitForURL(/\/login\?/)
    await waitForHydration(page)
    expect(new URL(page.url()).searchParams.get('next')).toBe('/proyectos?nuevo=vivienda')
    // Nunca había ingresado: no es una "sesión vencida".
    await expect(page.getByText('Tu sesión venció')).toHaveCount(0)

    await submitLogin(page, account)
    await page.waitForURL(/\/proyectos$/)
    // Ni el correo ni la contraseña viajan nunca en la URL.
    expect(page.url()).not.toContain(encodeURIComponent(account.email))
    expect(page.url()).not.toContain(account.password)
    const dialog = page.getByRole('dialog', { name: 'Nuevo proyecto' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('radio', { name: /^Vivienda/ })).toBeChecked()
    // El parámetro se limpia: recargar no vuelve a abrir el diálogo.
    expect(new URL(page.url()).search).toBe('')
  })

  test('/login?motivo=sesion avisa que la sesión venció y, al ingresar, se vuelve a next', async ({ page }) => {
    const account = await createAccount()
    await gotoLogin(page, `?motivo=sesion&next=${encodeURIComponent('/laboratorio')}`)
    await expect(page.getByRole('status').filter({ hasText: SESSION_NOTICE })).toBeVisible()
    await submitLogin(page, account)
    await page.waitForURL('**/laboratorio')
  })

  test('si la API responde 401, se manda a ingresar con el aviso y después se vuelve a la lista', async ({ page }) => {
    const account = await createAccount()
    await signInViaUi(page, account)
    await page.route('**/v1/projects', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'no_autenticado', message: 'Tu sesión venció.' } }) }),
    )
    await page.reload()
    await page.waitForURL(/\/login\?/)
    await waitForHydration(page)
    const url = new URL(page.url())
    expect(url.searchParams.get('motivo')).toBe('sesion')
    expect(url.searchParams.get('next')).toBe('/proyectos')
    await expect(page.getByRole('status').filter({ hasText: SESSION_NOTICE })).toBeVisible()

    await page.unroute('**/v1/projects')
    await submitLogin(page, account)
    await page.waitForURL('**/proyectos')
  })

  test('un next que apunta a otro sitio se ignora: tras ingresar se queda en la aplicación', async ({ page }) => {
    const account = await createAccount()
    for (const evil of ['//evil.com/robo', '/\\evil.com', 'https://evil.com/robo', 'javascript:alert(1)', '/%2F/evil.com']) {
      await gotoLogin(page, `?next=${encodeURIComponent(evil)}`)
      await submitLogin(page, account)
      await page.waitForURL('**/proyectos')
      expect(new URL(page.url()).origin, evil).toBe(BASE_ORIGIN)
    }
  })
})

test.describe('primera vez', () => {
  test('crear cuenta lleva a la bienvenida y elegir un tipo abre el diálogo con ese tipo marcado', async ({ page }) => {
    await blockNonLocalSignups(page)
    const account = newAccount()
    await gotoLogin(page, '?modo=crear')
    await page.getByLabel('¿Cómo te llamamos?').fill('  Aea   Prueba ')
    await page.getByLabel('Correo').fill(account.email)
    await password(page).fill(account.password)
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click()

    await page.waitForURL('**/bienvenida')
    await expect(page.getByText('Paso 1 de 2')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: /Hola, Aea\./ })).toBeVisible()
    await page.getByRole('link', { name: 'Vivienda' }).click()

    const dialog = page.getByRole('dialog', { name: 'Nuevo proyecto' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('radio', { name: /^Vivienda/ })).toBeChecked()
    await expect(page).toHaveURL(/\/proyectos$/)

    // La cuenta nueva saluda por su nombre (no por el correo) y el avatar usa las iniciales del nombre.
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: /^Aea,/ })).toBeVisible()
    await expect(page.getByRole('img', { name: /^Cuenta de / })).toHaveText('AP')
  })

  test('"Prefiero empezar en blanco" abre el diálogo con "En blanco" marcado', async ({ page }) => {
    await signInViaUi(page, await createAccount())
    await page.goto('/bienvenida')
    await page.getByRole('link', { name: 'Prefiero empezar en blanco' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nuevo proyecto' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('group', { name: 'Plantilla' }).getByRole('radio', { name: /^En blanco/ })).toBeChecked()
    await expect(page).toHaveURL(/\/proyectos$/)
  })

  test('/bienvenida sin sesión manda a ingresar (sin guardar la ruta) y tras ingresar se va a /proyectos', async ({ page }) => {
    const account = await createAccount()
    await page.goto('/bienvenida')
    await page.waitForURL(/\/login/)
    await waitForHydration(page)
    expect(new URL(page.url()).searchParams.has('next')).toBe(false)
    await submitLogin(page, account)
    await page.waitForURL('**/proyectos')
  })

  test('al ingresar con una cuenta que ya existe no se pasa por la bienvenida', async ({ page }) => {
    await signInViaUi(page, await createAccount())
    await expect(page).toHaveURL(/\/proyectos$/)
  })
})
