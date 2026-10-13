import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppHeader } from '../src/components/AppHeader'

const base = { email: 'victoria@interiores.test', name: 'Victoria', onSignOut: () => {} }
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('AppHeader en /proyectos (con buscador y «Nuevo proyecto»)', () => {
  const markup = renderToStaticMarkup(<AppHeader {...base} onNew={() => {}} onQuery={() => {}} query="" />)

  it('trae el buscador, el botón de nuevo proyecto y el enlace al laboratorio', () => {
    expect(markup).toContain('aria-label="Buscar proyectos y plantillas"')
    expect(textOf(markup)).toContain('Nuevo proyecto')
    expect(markup).toMatch(/<a[^>]*href="\/laboratorio"/)
  })

  it('no ofrece «Mis proyectos» (ya está en esa página) y el laboratorio no está marcado como actual', () => {
    expect(markup).not.toContain('aria-label="Mis proyectos"')
    expect(markup).not.toContain('aria-current')
  })
})

describe('AppHeader en /laboratorio (sin buscador ni «Nuevo proyecto»)', () => {
  const markup = renderToStaticMarkup(<AppHeader {...base} current="laboratorio" />)

  it('no muestra un buscador que no filtraría nada ni el botón de nuevo proyecto', () => {
    expect(markup).not.toContain('type="search"')
    expect(textOf(markup)).not.toContain('Nuevo proyecto')
  })

  it('ofrece volver a «Mis proyectos» con un enlace a /proyectos que tiene nombre', () => {
    expect(markup).toMatch(/<a[^>]*aria-label="Mis proyectos"[^>]*href="\/proyectos"|<a[^>]*href="\/proyectos"[^>]*aria-label="Mis proyectos"/)
  })

  it('marca el laboratorio como la página actual', () => {
    expect(markup).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/laboratorio"|<a[^>]*href="\/laboratorio"[^>]*aria-current="page"/)
  })

  it('conserva el avatar con las iniciales y el botón de salir, y los íconos son decorativos', () => {
    expect(markup).toContain('aria-label="Cuenta de victoria@interiores.test"')
    expect(markup).toContain('aria-label="Salir"')
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toContain('aria-hidden="true"')
  })

  it('mientras sale, el botón de salir queda ocupado y deshabilitado', () => {
    const leaving = renderToStaticMarkup(<AppHeader {...base} current="laboratorio" signingOut />)
    expect(leaving).toMatch(/<button[^>]*aria-busy="true"[^>]*disabled=""|<button[^>]*disabled=""[^>]*aria-busy="true"/)
  })
})
