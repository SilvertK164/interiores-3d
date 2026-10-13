import type { Locator, Page } from '@playwright/test'
import { ready } from './editor'

export const PROJECT_URL = /\/proyectos\/[0-9a-f-]{36}$/

export type NewProjectOptions = {
  name: string
  kind?: 'vivienda' | 'comercio'
  /** Parte del nombre visible de la plantilla ("Concept store"). `null` = "En blanco". Sin valor = la que el diálogo ya trae elegida. */
  template?: string | null
  /** Por defecto espera a que el editor termine de cargar. */
  waitForEditor?: boolean
}

const KIND_LABEL = { vivienda: 'Vivienda', comercio: 'Comercio' } as const

/** Abre el diálogo "Nuevo proyecto" desde la cabecera de /proyectos y lo devuelve. */
export async function openNewProjectDialog(page: Page): Promise<Locator> {
  // La cabecera siempre tiene el botón; las tarjetas y la invitación traen otros con el mismo nombre.
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await dialog.waitFor()
  return dialog
}

/** Hace clic en la tarjeta (etiqueta) cuyo radio tiene ese nombre: lo mismo que hace una persona (el radio en sí está oculto). */
const pick = (scope: Locator, name: RegExp) =>
  scope.locator('label').filter({ has: scope.page().getByRole('radio', { name }) }).click()

/** Elige tipo y plantilla en el diálogo abierto. */
export async function chooseInDialog(dialog: Locator, { kind, template }: Pick<NewProjectOptions, 'kind' | 'template'>) {
  if (kind) await pick(dialog, new RegExp(`^${KIND_LABEL[kind]}`))
  const templates = dialog.getByRole('group', { name: 'Plantilla' })
  if (template === null) await pick(templates, /^En blanco/)
  else if (template) await pick(templates, new RegExp(template))
}

/** Crea un proyecto por la interfaz (diálogo "Nuevo proyecto") y devuelve la URL del proyecto abierto. */
export async function createProjectViaUi(page: Page, options: NewProjectOptions): Promise<string> {
  await page.goto('/proyectos')
  const dialog = await openNewProjectDialog(page)
  await dialog.getByLabel('Nombre del proyecto').fill(options.name)
  await chooseInDialog(dialog, options)
  await dialog.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.waitForURL(PROJECT_URL, { timeout: 60_000 })
  if (options.waitForEditor !== false) await ready(page)
  return page.url()
}

/** Un proyecto en blanco con nombre único (`E2E <etiqueta> <hora>`); devuelve la URL del proyecto abierto. */
export const createBlankProject = (page: Page, label: string) =>
  createProjectViaUi(page, { name: `E2E ${label} ${Date.now()}`, template: null })
