import type { Page } from '@playwright/test'

export const modeButton = (page: Page, name: 'Ver' | 'Editar') =>
  page.getByRole('group', { name: 'Modo del editor' }).getByRole('button', { name, exact: true })

export const viewButton = (page: Page, name: '2D' | '3D' | 'Ambas') =>
  page.getByRole('group', { name: 'Vista del plano' }).getByRole('button', { name, exact: true })

export const undoRedo = (page: Page) => ({
  group: page.getByRole('group', { name: 'Historial' }),
  undo: page.getByRole('button', { name: 'Deshacer' }),
  redo: page.getByRole('button', { name: 'Rehacer' }),
})

export const dock = (page: Page) => page.getByRole('toolbar', { name: 'Herramientas de edición' })

export const dockButton = (page: Page, name: string) => dock(page).getByRole('button', { name, exact: true })
