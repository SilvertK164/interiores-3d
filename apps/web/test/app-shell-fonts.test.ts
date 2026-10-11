import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../app/app-shell.css', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../src/components/AppShell.tsx', import.meta.url), 'utf8')

/** Cuerpos de los bloques `@theme` que NO son `inline` (los que Tailwind define en :root). */
function plainThemeBlocks(source: string): string[] {
  return [...source.matchAll(/@theme\s*\{([^}]*)\}/g)].map((m) => m[1] ?? '')
}

describe('tipografía de la interfaz propia', () => {
  it('no referencia variables de next/font dentro de @theme (se resolverían en :root, donde no existen)', () => {
    for (const block of plainThemeBlocks(css)) expect(block).not.toMatch(/var\(--font-/)
  })

  it('cada variable de fuente que usa el CSS la declara AppShell con next/font', () => {
    const used = new Set([...css.matchAll(/var\((--font-[a-z0-9-]+)\)/g)].map((m) => m[1]))
    expect(used.size).toBeGreaterThan(0)
    for (const name of used) expect(shell).toContain(`variable: '${name}'`)
  })
})
