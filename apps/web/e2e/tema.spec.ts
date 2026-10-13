import { expect, test } from '@playwright/test'
import { createProjectViaUi } from './support/projects'
import { luminanceOf } from './support/theme'

type Hooks = { theme(): { sceneTheme: string; unit: string } }

test('el editor es claro aunque Pascal ponga body.dark, con escena studio, metros y la tipografía de Madori', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E tema ${Date.now()}`, template: null })
  // Pascal pone `dark` en <body> y en la raíz de su layout al montar: el tema no puede depender de que no lo haga.
  await expect(page.locator('body')).toHaveClass(/\bdark\b/)

  const surfaces = await page.evaluate(() => {
    const dock = document.querySelector('[data-guide-target="mode-select"]')?.closest('.fixed') ?? null
    const pick = (name: string, el: Element | null) => (el ? [{ name, color: getComputedStyle(el).backgroundColor }] : [])
    return [
      ...pick('body', document.body),
      ...pick('raíz del layout de Pascal', document.querySelector('div.dark.flex')),
      ...pick('dock de Pascal (si está)', dock),
    ]
  })
  expect(surfaces.length).toBeGreaterThanOrEqual(2)
  for (const { name, color } of surfaces) {
    expect(luminanceOf(color) ?? 1, `${name}: ${color}`).toBeGreaterThanOrEqual(0.6)
  }

  const shadows = await page.evaluate(() => ({
    root: getComputedStyle(document.documentElement).getPropertyValue('--shadow-color').trim(),
    dark: getComputedStyle(document.querySelector('div.dark.flex') as Element).getPropertyValue('--shadow-color').trim(),
  }))
  expect(shadows.dark).toBe(shadows.root)

  const theme = await page.evaluate(() => (window as unknown as { __e2e: Hooks }).__e2e.theme())
  expect(theme).toEqual({ sceneTheme: 'studio', unit: 'metric' })

  const font = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.className = 'font-barlow'
    document.body.appendChild(probe)
    const family = getComputedStyle(probe).fontFamily
    probe.remove()
    return family
  })
  expect(font).toContain('DM Sans')
})
