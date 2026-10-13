import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// «Escena desde una foto» es una función del producto, no un laboratorio: nada de lo que ve la persona (ni lo que dicen sus
// comentarios) habla de «Laboratorio», de Victoria ni de un modelado «en blanco», y la ruta vieja solo existe como redirección.
const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
const read = (path: string) => readFileSync(path, 'utf8')

const SCREEN = [...walk(root('app/escena-desde-foto')), root('src/components/AppHeader.tsx'), root('src/components/ProjectsSection.tsx')]

describe('«Escena desde una foto» como parte del producto', () => {
  it('la página vive en app/escena-desde-foto y app/laboratorio ya no existe', () => {
    expect(existsSync(root('app/escena-desde-foto/page.tsx'))).toBe(true)
    expect(existsSync(root('app/escena-desde-foto/loading.tsx'))).toBe(true)
    expect(existsSync(root('app/laboratorio'))).toBe(false)
  })

  it.each(SCREEN)('%s no dice «Laboratorio», «Victoria» ni «en blanco»', (file) => {
    expect(read(file)).not.toMatch(/laboratorio|victoria|en blanco/i)
  })

  it('ningún enlace ni redirección del código apunta a /laboratorio (solo next.config.mjs, que lo redirige)', () => {
    const code = [...walk(root('src')), ...walk(root('app'))].filter((file) => /\.(ts|tsx)$/.test(file))
    expect(code.filter((file) => /['"`]\/laboratorio/.test(read(file)))).toEqual([])
  })
})
