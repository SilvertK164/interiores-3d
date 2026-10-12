import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BRAND, WINDOW } from '../src/lib/brand'
import { LOGO } from '../src/lib/export/brand-paths'
import { renderModule, renderSvg } from '../scripts/build-brand-paths'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const read = (path: string) => readFileSync(here(path), 'utf8').replace(/\r\n/g, '\n')

describe('logotipo vectorial (criterio 11: sin imágenes)', () => {
  it('tiene dos tramos de letras (Mad y ri) hechos solo de caminos', () => {
    expect(LOGO.letters).toHaveLength(2)
    for (const d of LOGO.letters) {
      expect(d.startsWith('M')).toBe(true)
      expect(d).toMatch(/^[MLQCZ0-9.\-\s]+$/)
      expect(d).not.toMatch(/NaN|undefined|Infinity/)
    }
  })

  it('la caja de la ventana mide 0,5 × 0,479 em y queda entre "Mad" y "ri"', () => {
    expect(LOGO.window.width).toBe(500)
    expect(LOGO.window.height).toBe(479)
    expect(LOGO.window.y).toBe(-465)
    expect(LOGO.window.x).toBeGreaterThan(1000)
    expect(LOGO.box.minX).toBeLessThanOrEqual(LOGO.window.x)
    expect(LOGO.box.minX + LOGO.box.width).toBeGreaterThanOrEqual(LOGO.window.x + LOGO.window.width)
  })

  it('el logotipo mide entre 2 y 4 em de ancho y entre 0,6 y 1,3 em de alto', () => {
    expect(LOGO.box.width).toBeGreaterThan(2000)
    expect(LOGO.box.width).toBeLessThan(4000)
    expect(LOGO.box.height).toBeGreaterThan(600)
    expect(LOGO.box.height).toBeLessThan(1300)
  })

  it('el módulo y el SVG commiteados son exactamente lo que escriben los renderizadores del script', () => {
    // La regeneración desde Fraunces pide `fontkit` y la fuente (ver el encabezado del script); aquí se vigila que los dos
    // archivos sigan siendo uno solo: el SVG y el módulo salen del mismo dibujo.
    const logo = JSON.parse(JSON.stringify(LOGO))
    expect(read('../src/lib/export/brand-paths.ts')).toBe(renderModule(logo))
    expect(read('../public/brand/madori-logotipo.svg')).toBe(renderSvg(logo))
  })

  it('el SVG usa la ventana y los colores de la marca y no trae imágenes ni texto', () => {
    const svg = read('../public/brand/madori-logotipo.svg')
    expect(svg).toContain(WINDOW.frame)
    expect(svg).toContain(BRAND.noche)
    expect(svg).toContain(BRAND.sol)
    expect(svg).not.toMatch(/<image|<text|font-family/)
    expect(svg).toMatch(/viewBox="-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+"/)
  })
})
