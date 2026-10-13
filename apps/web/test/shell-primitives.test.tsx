import { readFileSync } from 'node:fs'
import { Eye, PenLine } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Badge, ChipRow, FLOAT, Segmented } from '../src/editor/shell/ui/primitives'

const css = readFileSync(new URL('../app/editor-shell.css', import.meta.url), 'utf8')
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const MODES = [
  { id: 'ver', icon: Eye, label: 'Ver' },
  { id: 'editar', icon: PenLine, label: 'Editar' },
] as const

describe('Segmented', () => {
  const markup = renderToStaticMarkup(
    <Segmented label="Modo del editor" items={MODES} value="editar" onChange={() => {}} />,
  )

  it('es un grupo con leyenda para lectores de pantalla y un botón por opción', () => {
    expect(markup).toContain('<legend class="sr-only">Modo del editor</legend>')
    expect(markup.match(/<button /g)).toHaveLength(2)
  })

  it('marca con aria-pressed solo la opción elegida, en azul noche con texto blanco', () => {
    const buttons = [...markup.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*class="([^"]*)"[^>]*>(.*?)<\/button>/g)]
    expect(buttons.map((m) => [m[1], textOf(m[3] ?? '')])).toEqual([
      ['false', 'Ver'],
      ['true', 'Editar'],
    ])
    expect(buttons[1]?.[2]).toContain('bg-ink text-white')
    expect(buttons[0]?.[2]).not.toContain('bg-ink text-white')
  })

  it('sin valor (null) no deja ninguna opción activa', () => {
    const none = renderToStaticMarkup(<Segmented label="Vista" items={MODES} value={null} />)
    expect(none).not.toContain('aria-pressed="true"')
  })
})

describe('ChipRow', () => {
  const CHIPS = [
    { value: 'up', label: 'Completos' },
    { value: 'cutaway', label: 'Cortados' },
  ]
  const render = (active: string) => renderToStaticMarkup(<ChipRow title="Muros" chips={CHIPS} active={active} onPick={() => {}} />)

  it('es un grupo con leyenda para lectores de pantalla y un botón por opción', () => {
    const markup = render('cutaway')
    expect(markup).toContain('<legend class="sr-only">Muros</legend>')
    expect(textOf(markup)).toBe('MurosCompletosCortados')
  })

  it('marca con aria-pressed solo la opción activa, en azul noche con texto blanco; con un valor que no existe no marca ninguna', () => {
    const markup = render('cutaway')
    expect([...markup.matchAll(/aria-pressed="(true|false)"/g)].map((m) => m[1])).toEqual(['false', 'true'])
    expect(markup).toContain('bg-ink text-white')
    expect(render('')).not.toContain('aria-pressed="true"')
  })
})

describe('Badge y estilos', () => {
  it('la insignia lleva tinta oscura sobre ámbar suave, nunca el Sol como texto', () => {
    const markup = renderToStaticMarkup(<Badge>Pronto</Badge>)
    expect(markup).toContain('text-sun-ink')
    expect(markup).not.toContain('text-sun ')
  })

  it('todo lo que flota usa la clase de vidrio y sombra del shell', () => {
    expect(FLOAT).toBe('glass shell-float')
    expect(css).toMatch(/\.shell-float\s*\{[^}]*box-shadow/)
    expect(css).toMatch(/\.shell-hit::after/)
  })

  it('el CSS del shell respeta "reducir movimiento" y "reducir transparencia"', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^@]*\.editor-shell \*[^}]*transition: none !important/)
    expect(css).toMatch(/prefers-reduced-transparency: reduce\)\s*\{\s*\.shell-float/)
  })
})
