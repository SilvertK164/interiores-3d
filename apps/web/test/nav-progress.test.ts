import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NavProgressBar } from '../src/components/NavProgress'
import { type NavState, initialNavState, navReducer } from '../src/lib/nav-progress'

const css = readFileSync(new URL('../src/components/NavProgress.css', import.meta.url), 'utf8')
type Action = Parameters<typeof navReducer>[1]
const run = (...actions: Action[]) => actions.reduce<NavState>(navReducer, initialNavState)
const start = (id: string): Action => ({ type: 'pending', id, pending: true })
const end = (id: string): Action => ({ type: 'pending', id, pending: false })

describe('estado de la barra de navegación (lógica pura)', () => {
  it('empieza en reposo y sin navegaciones', () => {
    expect(initialNavState).toEqual({ phase: 'idle', sources: [] })
  })

  it('al iniciar una navegación pasa a pendiente y al terminar, a completa', () => {
    expect(run(start('a')).phase).toBe('pending')
    expect(run(start('a'), end('a')).phase).toBe('done')
  })

  it('"reset" devuelve de completa a reposo y no corta una navegación pendiente', () => {
    expect(run(start('a'), end('a'), { type: 'reset' }).phase).toBe('idle')
    expect(run(start('a'), { type: 'reset' }).phase).toBe('pending')
  })

  it('con dos navegaciones a la vez espera a que terminen las dos', () => {
    expect(run(start('a'), start('b'), end('a')).phase).toBe('pending')
    expect(run(start('a'), start('b'), end('a'), end('b')).phase).toBe('done')
  })

  it('la misma fuente avisada dos veces cuenta una sola', () => {
    const twice = run(start('a'), start('a'))
    expect(twice.sources).toEqual(['a'])
    expect(navReducer(twice, end('a')).phase).toBe('done')
  })

  it('terminar algo que nunca empezó no enciende la barra', () => {
    expect(run(end('z'))).toEqual(initialNavState)
  })

  it('una navegación nueva sobre una completa la vuelve a poner pendiente', () => {
    expect(run(start('a'), end('a'), start('b')).phase).toBe('pending')
  })
})

describe('barra de navegación (vista)', () => {
  it('es decorativa y expone su fase', () => {
    const html = renderToStaticMarkup(createElement(NavProgressBar, { phase: 'pending' }))
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('data-state="pending"')
    expect(html).toContain('madori-nav')
  })

  it('es plana, cobalto, de 3 px y respeta prefers-reduced-motion', () => {
    expect(css).toMatch(/#1F5FE0/i)
    expect(css).toMatch(/height:\s*3px/)
    expect(css).not.toMatch(/gradient/i)
    expect(css).toContain('prefers-reduced-motion')
    expect(css.slice(css.indexOf('prefers-reduced-motion'))).toContain('animation: none')
    const classes = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/\.[a-z][\w-]*/g) ?? []
    expect(classes.every((c) => c.startsWith('.madori-'))).toBe(true)
  })
})
