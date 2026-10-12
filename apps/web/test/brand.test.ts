import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Loader } from '../src/components/Loader'
import { Logo } from '../src/components/Logo'
import { BRAND, ICON, WINDOW } from '../src/lib/brand'
import { APP_NAME } from '../src/lib/ui-text'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const loaderCss = read('../src/components/Loader.css')
const tokensCss = read('../app/app-shell.css')
const svgs = {
  'public/logo.svg': read('../public/logo.svg'),
  'app/icon.svg': read('../app/icon.svg'),
}

describe('nombre de la plataforma', () => {
  it('es Madori', () => expect(APP_NAME).toBe('Madori'))
})

describe('icono (logo.svg y favicon): ventana Noche y Sol sobre un cuadrado Crema', () => {
  it('logo.svg y el favicon son el mismo dibujo', () => {
    expect(svgs['app/icon.svg']).toBe(svgs['public/logo.svg'])
  })
  for (const [name, svg] of Object.entries(svgs)) {
    it(`${name} usa Crema de fondo, la ventana en Noche y el sol, sin Cobalto ni círculo de fondo`, () => {
      expect(svg).toContain(BRAND.crema)
      expect(svg).toContain(BRAND.noche)
      expect(svg).toContain(BRAND.sol)
      expect(svg).not.toMatch(/#1F5FE0/i)
      expect(svg).not.toMatch(/interiores/i)
      expect(svg).toContain('aria-label="Madori"')
      expect(svg).toContain(WINDOW.frame)
    })
    it(`${name} es un cuadrado redondeado, sin anillo y con un único círculo: el sol`, () => {
      expect(svg).toMatch(new RegExp(`<rect[^>]*rx="${ICON.radius}"[^>]*fill="${BRAND.crema}"`, 'i'))
      expect(svg).toContain(`transform="${ICON.transform}"`)
      const circles = svg.match(/<circle[^>]*>/g) ?? []
      expect(circles).toHaveLength(1)
      expect(circles[0]).toContain(`r="${ICON.sunRadius}"`)
      expect(circles[0]).toContain(`fill="${BRAND.sol}"`)
      expect(svg).not.toMatch(/stroke-width="2\.2"/)
    })
    it(`${name} no lleva degradados`, () => expect(svg).not.toMatch(/gradient/i))
  }
})

describe('paleta Noche y Sol', () => {
  it('app-shell.css define los cinco colores nuevos y ya no usa los anteriores', () => {
    const css = tokensCss.toLowerCase()
    for (const hex of [BRAND.noche, BRAND.sol, BRAND.cielo, BRAND.crema, BRAND.cobalto])
      expect(css).toContain(hex.toLowerCase())
    expect(css).not.toContain('#0e1220')
    expect(css).not.toContain('#ffb35c')
    expect(css).not.toContain('14 18 32')
  })
  it('los valores de BRAND son los acordados', () => {
    expect(BRAND).toMatchObject({
      cobalto: '#1F5FE0',
      noche: '#0B1F4D',
      sol: '#FFB02E',
      cielo: '#CFE0FF',
      crema: '#FFF4E2',
    })
  })
})

describe('Logo', () => {
  it('con showName es una imagen accesible "Madori" y sus partes quedan ocultas', () => {
    const html = renderToStaticMarkup(createElement(Logo, { showName: true }))
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Madori"')
    // Letras y ventana no se leen por separado.
    expect(html.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(2)
  })
  it('es estático por defecto: sin animación ni anillo que se mueva', () => {
    const html = renderToStaticMarkup(createElement(Logo, { showName: true }))
    expect(html).not.toMatch(/madori-loader|animation|<animate/)
  })
  it('sin showName es el icono (cuadrado Crema) y decorativo', () => {
    const html = renderToStaticMarkup(createElement(Logo, { size: 40 }))
    expect(html).toContain('src="/logo.svg"')
    expect(html).toContain('width="40"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('role="img"')
  })
})

describe('Loader (compacto, para botones y acciones)', () => {
  it('anuncia el estado de carga con un texto en castellano configurable', () => {
    const base = renderToStaticMarkup(createElement(Loader))
    expect(base).toContain('role="status"')
    expect(base).toContain('Abriendo tu espacio')
    expect(
      renderToStaticMarkup(createElement(Loader, { label: 'Cargando tus proyectos' })),
    ).toContain('Cargando tus proyectos')
  })
  it('tiene dos tamaños y ya no tiene versión de pantalla completa (es LoaderPortal)', () => {
    for (const size of ['sm', 'md'] as const) {
      expect(renderToStaticMarkup(createElement(Loader, { size }))).toContain(
        `madori-loader--${size}`,
      )
      expect(loaderCss).toContain(`.madori-loader--${size}`)
    }
    expect(loaderCss).not.toContain('--lg')
    expect(loaderCss).not.toContain('--screen')
  })
  it('es solo la ventana: sin letras del logotipo', () => {
    expect(renderToStaticMarkup(createElement(Loader, { showLabel: false }))).not.toContain('Madori')
  })
  it('su CSS respeta prefers-reduced-motion y deja el sol visible', () => {
    expect(loaderCss).toContain('prefers-reduced-motion')
    const reduced = loaderCss.slice(loaderCss.indexOf('prefers-reduced-motion'))
    expect(reduced).toContain('animation: none')
    expect(reduced).toMatch(/transform:\s*none/)
  })
  it('no depende de los tokens de .app-shell (el editor no los tiene)', () => {
    expect(loaderCss).not.toMatch(/var\(--color-/)
    expect(loaderCss).not.toMatch(/var\(--font-/)
    expect(loaderCss).toMatch(/#0B1F4D/i)
    expect(loaderCss).toMatch(/#FFB02E/i)
    const withoutComments = loaderCss.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const cls of withoutComments.match(/\.[a-z][\w-]*/g) ?? [])
      expect(cls).toMatch(/^\.madori-/)
  })
  it('su CSS no usa degradados', () => expect(loaderCss).not.toMatch(/gradient/i))
})
