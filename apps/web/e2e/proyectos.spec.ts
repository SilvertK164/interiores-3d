import { expect, test } from '@playwright/test'
import { chooseInDialog, createProjectViaUi, openNewProjectDialog } from './support/projects'
import { createAccount, signInViaUi } from './support/user'

test('un proyecto creado desde una plantilla muestra su imagen en la lista y se encuentra al buscar', async ({ page }) => {
  const name = `E2E imagen ${Date.now()}`
  await createProjectViaUi(page, { name, kind: 'comercio', template: 'Café de especialidad', waitForEditor: false })
  await page.goto('/proyectos')
  const card = page.getByRole('link', { name: new RegExp(name) })
  const image = card.locator('img')
  await expect(image).toHaveAttribute('src', '/templates/cafe.jpg')
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)

  // El buscador filtra por nombre de proyecto y por nombre de plantilla.
  const search = page.getByRole('searchbox', { name: 'Buscar proyectos y plantillas' })
  await search.fill('especialidad')
  await expect(card).toBeVisible()
  await search.fill('zzz-no-existe')
  await expect(card).toHaveCount(0)
  await expect(page.getByText('Ningún proyecto coincide')).toBeVisible()
})

test('sin proyectos aparece la invitación a empezar el primero', async ({ browser }) => {
  const context = await browser.newContext() // cuenta nueva y vacía
  const page = await context.newPage()
  await signInViaUi(page, await createAccount())
  await expect(page.getByRole('heading', { name: 'Empieza tu primer proyecto' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Tus proyectos' })).toHaveCount(0)
  // La invitación lleva su propio botón para abrir el diálogo.
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).last().click()
  await expect(page.getByRole('dialog', { name: 'Nuevo proyecto' })).toBeVisible()
  await context.close()
})

test('el diálogo "Nuevo proyecto" se cierra con Esc, atrapa el foco y lo devuelve al botón', async ({ page }) => {
  await page.goto('/proyectos')
  const opener = page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).first()
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Nombre del proyecto')).toBeFocused()

  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    // El resto de la página queda inerte: el foco nunca sale del diálogo (o pasa al propio navegador).
    const inside = await page.evaluate(() => document.activeElement === document.body || document.activeElement?.closest('dialog') != null)
    expect(inside).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('elegir una plantilla del mosaico abre el diálogo con esa plantilla y su tipo ya marcados', async ({ page }) => {
  await page.goto('/proyectos')
  await page.getByRole('button', { name: /Empezar con Loft/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await expect(dialog.getByRole('radio', { name: /^Vivienda/ })).toBeChecked()
  const templates = dialog.getByRole('group', { name: 'Plantilla' })
  await expect(templates.getByRole('radio', { name: /Loft/ })).toBeChecked()
  // Con Vivienda solo hay una plantilla, más "En blanco".
  await expect(templates.getByRole('radio')).toHaveCount(2)
  await chooseInDialog(dialog, { kind: 'comercio' })
  await expect(templates.getByRole('radio')).toHaveCount(4)
  await expect(templates.getByRole('radio', { name: /Concept store/ })).toBeChecked()
})

test('en escritorio la página de proyectos cabe en una pantalla, sin scroll vertical', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/proyectos')
  await expect(page.getByText('Cargando tus proyectos')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Empieza desde una plantilla' })).toBeVisible()
  const overflow = () => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  await expect.poll(overflow).toBeLessThanOrEqual(0)
})

test('crear sin elegir nada guarda un proyecto con la plantilla que traía marcada el diálogo', async ({ page }) => {
  const name = `E2E por defecto ${Date.now()}`
  await page.goto('/proyectos')
  const dialog = await openNewProjectDialog(page)
  await dialog.getByLabel('Nombre del proyecto').fill(name)
  await dialog.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.waitForURL(/\/proyectos\/[0-9a-f-]{36}$/, { timeout: 60_000 })
  await page.goto('/proyectos')
  await expect(page.getByRole('link', { name: new RegExp(name) }).locator('img')).toHaveAttribute('src', '/templates/concept-store.jpg')
})
