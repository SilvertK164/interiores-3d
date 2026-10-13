import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppHeader } from '../src/components/AppHeader'

const base = { email: 'victoria@interiores.test', name: 'Victoria', onSignOut: () => {} }
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('AppHeader en /proyectos (con buscador y «Nuevo proyecto»)', () => {
  const markup = renderToStaticMarkup(<AppHeader {...base} onNew={() => {}} onQuery={() => {}} query="" />)

  it('trae el buscador, el botón de nuevo proyecto y el enlace a «Escena desde una foto»', () => {
    expect(markup).toContain('aria-label="Buscar proyectos y plantillas"')
    expect(textOf(markup)).toContain('Nuevo proyecto')
    expect(markup).toMatch(/<a[^>]*href="\/escena-desde-foto"/)
  })

  it('no ofrece «Mis proyectos» (ya está en esa página) y la escena desde una foto no está marcada como actual', () => {
    expect(markup).not.toContain('aria-label="Mis proyectos"')
    expect(markup).not.toContain('aria-current')
  })
})

describe('AppHeader en /escena-desde-foto (sin buscador ni «Nuevo proyecto»)', () => {
  const markup = renderToStaticMarkup(<AppHeader {...base} current="escena-desde-foto" />)

  it('no muestra un buscador que no filtraría nada ni el botón de nuevo proyecto', () => {
    expect(markup).not.toContain('type="search"')
    expect(textOf(markup)).not.toContain('Nuevo proyecto')
  })

  it('ofrece volver a «Mis proyectos» con un enlace a /proyectos que tiene nombre', () => {
    expect(markup).toMatch(/<a[^>]*aria-label="Mis proyectos"[^>]*href="\/proyectos"|<a[^>]*href="\/proyectos"[^>]*aria-label="Mis proyectos"/)
  })

  it('marca «Escena desde una foto» como la página actual, con su nombre y su título', () => {
    expect(markup).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/escena-desde-foto"|<a[^>]*href="\/escena-desde-foto"[^>]*aria-current="page"/)
    expect(markup).toContain('aria-label="Escena desde una foto"')
    expect(markup).toContain('title="Escena desde una foto"')
  })

  it('no dice «Laboratorio» en ninguna parte', () => {
    expect(markup).not.toMatch(/laboratorio/i)
  })

  it('conserva el avatar con las iniciales y el botón de salir, y los íconos son decorativos', () => {
    expect(markup).toContain('aria-label="Cuenta de victoria@interiores.test"')
    expect(markup).toContain('aria-label="Salir"')
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toContain('aria-hidden="true"')
  })

  it('mientras sale, el botón de salir queda ocupado y deshabilitado', () => {
    const leaving = renderToStaticMarkup(<AppHeader {...base} current="escena-desde-foto" signingOut />)
    expect(leaving).toMatch(/<button[^>]*aria-busy="true"[^>]*disabled=""|<button[^>]*disabled=""[^>]*aria-busy="true"/)
  })
})
