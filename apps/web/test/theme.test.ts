import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, luminanceOf } from '../e2e/support/theme'

const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const elevation = readFileSync(new URL('../app/elevation.css', import.meta.url), 'utf8')
const rootBlock = /:root\s*\{([^}]*)\}/.exec(globals)?.[1] ?? ''
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(rootBlock)?.[1]

const SURFACES = ['background', 'card', 'popover', 'sidebar', 'secondary', 'muted', 'accent']
const TEXTS = ['foreground', 'card-foreground', 'popover-foreground', 'sidebar-foreground', 'secondary-foreground', 'accent-foreground', 'sidebar-accent-foreground']
const ALL = [...SURFACES, ...TEXTS, 'primary', 'primary-foreground', 'destructive', 'border', 'input', 'ring', 'sidebar-border', 'sidebar-accent', 'muted-foreground']

describe('tema claro de Madori (los 24 tokens de :root)', () => {
  it('cada token de color está definido en hexadecimal y --radius es de 0,75 rem o más', () => {
    for (const name of ALL) expect(token(name), name).toBeDefined()
    const radius = Number(/--radius:\s*([\d.]+)rem/.exec(rootBlock)?.[1])
    expect(radius).toBeGreaterThanOrEqual(0.75)
  })

  it('ninguna superficie es oscura y todo texto es oscuro sobre ellas (nada de fondos oscuros)', () => {
    for (const name of SURFACES) expect(luminanceOf(token(name) ?? '') ?? -1, name).toBeGreaterThan(0.6)
    for (const name of TEXTS) expect(luminanceOf(token(name) ?? '') ?? 2, name).toBeLessThan(0.05)
  })

  it('el texto pasa 7:1 sobre el fondo y el gris de apoyo pasa 4,5:1 sobre el fondo del lienzo', () => {
    expect(contrastRatio(token('foreground') ?? '', token('background') ?? '') ?? 0).toBeGreaterThanOrEqual(7)
    expect(contrastRatio(token('muted-foreground') ?? '', token('muted') ?? '') ?? 0).toBeGreaterThanOrEqual(4.5)
  })

  it('la acción primaria es el Cobalto con texto blanco y el foco usa el mismo Cobalto', () => {
    expect(token('primary')?.toLowerCase()).toBe('#1f5fe0')
    expect(token('primary-foreground')?.toLowerCase()).toBe('#ffffff')
    expect(token('ring')?.toLowerCase()).toBe('#1f5fe0')
  })
})

describe('lo que Pascal sigue usando', () => {
  it('define la fuente de las clases font-barlow con la de la interfaz (DM Sans)', () => {
    expect(globals).toMatch(/@theme inline\s*\{[^}]*--font-barlow:\s*var\(--font-dm\)/)
  })

  it('el bloque .dark de las sombras ya no pinta bordes blancos internos', () => {
    expect(elevation).not.toMatch(/^\.dark\s*\{/m)
    expect(elevation).toContain('Madori no tiene modo oscuro')
  })
})
