import { expect, type Page, test } from '@playwright/test'
import { createBlankProject } from './support/projects'

/** Crea un proyecto en blanco, vuelve a /proyectos y devuelve su tarjeta, su botón «…» y su dirección. */
async function blankProjectCard(page: Page) {
  const url = await createBlankProject(page, 'eliminar')
  const id = url.split('/').pop() as string
  await page.goto('/proyectos')
  const card = page.getByRole('listitem').filter({ has: page.locator(`a[href="/proyectos/${id}"]`) })
  await expect(card).toBeVisible()
  const more = card.getByRole('button', { name: /^Más opciones del proyecto E2E eliminar / })
  return { id, card, more }
}

test('el botón «…» abre un menú sin navegar; Esc y un clic fuera lo cierran y el foco vuelve al botón', async ({ page }) => {
  const { id, more } = await blankProjectCard(page)
  await expect(more).toHaveAttribute('aria-haspopup', 'menu')
  await expect(more).toHaveAttribute('aria-expanded', 'false')

  await more.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(more).toHaveAttribute('aria-expanded', 'true')
  await expect(page).toHaveURL(/\/proyectos$/) // el clic NO abrió el proyecto
  const remove = menu.getByRole('menuitem', { name: 'Eliminar proyecto' })
  await expect(remove).toBeFocused()

  // Con un solo ítem, las flechas lo dejan donde está (dan la vuelta).
  await page.keyboard.press('ArrowDown')
  await expect(remove).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(remove).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(more).toBeFocused()
  await expect(more).toHaveAttribute('aria-expanded', 'false')

  // El teclado también lo abre (flecha abajo) y un clic fuera lo cierra.
  await page.keyboard.press('ArrowDown')
  await expect(menu).toBeVisible()
  await page.getByRole('heading', { name: 'Tus proyectos' }).click()
  await expect(menu).toHaveCount(0)

  // La tarjeta sigue siendo un enlace al proyecto.
  await expect(page.locator(`a[href="/proyectos/${id}"]`)).toBeVisible()
})

test('«Cancelar» no borra nada, devuelve el foco al botón y la tarjeta sigue ahí', async ({ page }) => {
  const { id, card, more } = await blankProjectCard(page)
  await more.click()
  await page.getByRole('menuitem', { name: 'Eliminar proyecto' }).click()

  const dialog = page.getByRole('dialog', { name: 'Eliminar proyecto' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/¿Eliminar «E2E eliminar \d+»\? Se borra con todo lo que tiene dentro y no se puede deshacer\./)
  const cancel = dialog.getByRole('button', { name: 'Cancelar' })
  await expect(cancel).toBeFocused() // foco inicial en lo menos peligroso
  await cancel.click()

  await expect(dialog).toBeHidden()
  await expect(card).toBeVisible()
  await expect(more).toBeFocused()

  // Esc también cancela.
  await more.click()
  await page.getByRole('menuitem', { name: 'Eliminar proyecto' }).click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(card).toBeVisible()

  // Sigue en la nube: recargar lo confirma.
  await page.reload()
  await expect(page.locator(`a[href="/proyectos/${id}"]`)).toBeVisible()
})

test('«Eliminar» borra el proyecto: la tarjeta desaparece sin recargar, aparece el aviso y no vuelve al recargar', async ({ page }) => {
  const { id, card, more } = await blankProjectCard(page)
  await more.click()
  await page.getByRole('menuitem', { name: 'Eliminar proyecto' }).click()

  const dialog = page.getByRole('dialog', { name: 'Eliminar proyecto' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Eliminar', exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(card).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Proyecto eliminado' })).toBeVisible()
  await expect(page).toHaveURL(/\/proyectos$/)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tus proyectos' })).toBeVisible()
  await expect(page.locator(`a[href="/proyectos/${id}"]`)).toHaveCount(0)
})
