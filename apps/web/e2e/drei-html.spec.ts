import { expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { modeButton, viewButton } from './support/shell'

// Guarda del parche de @react-three/drei (Html): en desarrollo (StrictMode) React 19 avisaba "unmount a root while React was already rendering".
test('las etiquetas Html de Pascal no provocan avisos de desmontaje ni errores de React al editar, cambiar de vista y de modo', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(String(e)))
  await createProjectViaUi(page, { name: `E2E html ${Date.now()}`, template: null })
  await hook(page, 'addWall')
  await hook(page, 'selectFirstWall')
  for (const view of ['3D', '2D', 'Ambas'] as const) await viewButton(page, view).click()
  await modeButton(page, 'Ver').click()
  await modeButton(page, 'Editar').click()
  await page.waitForTimeout(500)
  const react = problems.filter((p) => /unmount a root|already rendering|Maximum update depth|Can't perform a React state update/i.test(p))
  expect(react).toEqual([])
})
