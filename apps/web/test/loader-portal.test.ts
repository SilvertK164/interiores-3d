import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WINDOW } from '../src/lib/brand'

// next/font solo existe dentro del compilador de Next: aquí se sustituye por un objeto con la clase de la variable.
vi.mock('next/font/google', () => ({ Fraunces: () => ({ variable: 'fraunces-prueba' }) }))

const { LoaderPortal } = await import('../src/components/LoaderPortal')
const css = readFileSync(new URL('../src/components/LoaderPortal.css', import.meta.url), 'utf8')
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Cuerpo del bloque `@media (prefers-reduced-motion: reduce)` (hasta el final del archivo: es el último). */
const reducedBlock = () => withoutComments.slice(withoutComments.indexOf('prefers-reduced-motion'))
/** Declaraciones de la primera regla que empieza con `selector` (sin media queries). */
const rule = (selector: string) => {
  const start = withoutComments.indexOf(`${selector} {`)
  expect(start, `no hay una regla "${selector}"`).toBeGreaterThanOrEqual(0)
  return withoutComments.slice(start, withoutComments.indexOf('}', start))
}

describe('LoaderPortal (carga de pantalla completa)', () => {
  const html = renderToStaticMarkup(createElement(LoaderPortal))

  it('anuncia "Abriendo tu proyecto" a los lectores de pantalla y no muestra ese texto', () => {
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Abriendo tu proyecto"')
    expect(html).toContain('<span class="sr-only">Abriendo tu proyecto</span>')
    // Fuera del texto oculto solo quedan las letras del logotipo.
    const visibleText = html
      .replace('<span class="sr-only">Abriendo tu proyecto</span>', '')
      .replace(/<[^>]*>/g, '')
    expect(visibleText).toBe('Madri')
  })

  it('el texto es configurable', () => {
    const custom = renderToStaticMarkup(
      createElement(LoaderPortal, { label: 'Abriendo la escena' }),
    )
    expect(custom).toContain('aria-label="Abriendo la escena"')
    expect(custom).toContain('<span class="sr-only">Abriendo la escena</span>')
  })

  it('solo dibuja el logotipo: letras ocultas a los lectores, sin puntos ni barra de avance', () => {
    expect(html).not.toMatch(/progressbar|<progress|madori-dot/i)
    const letters = [
      ...html.matchAll(
        /<span aria-hidden="true" class="madori-portal__letter"[^>]*><span>(.)<\/span>/g,
      ),
    ]
    expect(letters.map((m) => m[1]).join('')).toBe('Madri')
  })

  it('cada letra lleva su distancia y su retraso como propiedades CSS', () => {
    expect(html).toContain('--d:1.35em')
    expect(html).toContain('--ld:0.16s')
    expect(html).toContain('--d:-0.65em')
  })

  it('reutiliza la geometría de la ventana: marco, 12 rayos, anillo, sol y vidrio', () => {
    expect(html).toContain(`d="${WINDOW.frame}"`)
    expect(html.match(/<line /g)).toHaveLength(12)
    expect(html).toContain('madori-w-ring')
    expect(html).toContain('madori-w-glass')
    // El marco se dibuja con un trazo continuo y las puntas redondas tapan la costura.
    expect(html).toContain('pathLength="100"')
    expect(html).toContain('stroke-linecap="round"')
  })
})

describe('LoaderPortal.css', () => {
  it('el ciclo dura 6,4 s y se repite', () => {
    expect(css).toContain('6.4s')
    expect(css).toMatch(/infinite/)
  })

  it('trae valores de respaldo para el primer render, antes de medir', () => {
    expect(rule('.madori-portal__word')).toMatch(/--dx:\s*-?[\d.]+em/)
    expect(rule('.madori-portal__word')).toMatch(/--dy:\s*-?[\d.]+em/)
    expect(rule('.madori-portal__word')).toMatch(/--S:\s*[\d.]+/)
  })

  it('el vidrio y el fondo usan el mismo color, #EEF2F8 por defecto', () => {
    expect(css).toMatch(/var\(--madori-bg,\s*#eef2f8\)/i)
    expect(rule('.madori-portal .madori-w-glass')).toContain('var(--madori-bg')
    expect(rule('.madori-portal')).toContain('var(--madori-bg')
  })

  it('con prefers-reduced-motion no hay animaciones y se ve el logotipo completo', () => {
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(reducedBlock()).toMatch(/animation:\s*none/)
    // El estado sin animar ya es el final: letras visibles, ventana en su sitio y sol quieto.
    expect(rule('.madori-portal__letter')).not.toMatch(/opacity:\s*0\b/)
    expect(rule('.madori-portal__win')).not.toMatch(/transform:\s*(?!none)/)
    expect(rule('.madori-portal .madori-w-rays')).toMatch(/opacity:\s*0/)
  })

  it('usa los hex de la marca, sin tokens de .app-shell ni degradados', () => {
    expect(css).toMatch(/#0b1f4d/i)
    expect(css).not.toMatch(/var\(--color-/)
    expect(css).not.toMatch(/gradient/i)
    for (const cls of withoutComments.match(/\.[a-z][\w-]*/g) ?? [])
      expect(cls).toMatch(/^\.madori-/)
  })
})
