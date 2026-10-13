import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const webDir = fileURLToPath(new URL('../', import.meta.url))
const exportDir = join(webDir, 'src/lib/export')

/** Todos los .ts y .tsx de una carpeta, con la ruta completa. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

// `import x from 'pdfkit'` o `import 'pdfkit'` (también con el pdf.js vendoreado): solo se admite `import()` dentro de una función.
const STATIC_IMPORT = /^\s*import\b[^;]*?\bfrom\s*['"](?:pdfkit|pdfjs-dist|\/pdfjs\/)|^\s*import\s*['"](?:pdfkit|pdfjs-dist|\/pdfjs\/)/m

describe('lo pesado se carga solo al usarlo (criterio 13)', () => {
  it('ningún archivo del producto importa pdfkit ni pdf.js de forma estática', () => {
    const files = [...sourceFiles(join(webDir, 'src')), ...sourceFiles(join(webDir, 'app'))]
    expect(files.length).toBeGreaterThan(50)
    const offenders = files.filter((file) => STATIC_IMPORT.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('la vista previa pide pdf.js con import() del navegador, sin empaquetarlo', () => {
    const source = readFileSync(join(webDir, 'src/editor/shell/ui/render-pdf-page.ts'), 'utf8')
    expect(source).toMatch(/import\(\/\* webpackIgnore: true \*\/ \/\* turbopackIgnore: true \*\/ LIBRARY_URL\)/)
    expect(source).toContain("'/pdfjs/pdf.min.mjs'")
    expect(source).toContain("'/pdfjs/pdf.worker.min.mjs'")
  })

  it('pdfkit solo lo trae Pascal: el parche lo carga con import() al exportar', () => {
    const patch = readFileSync(join(webDir, '../../patches/@pascal-app__editor@1.0.3.patch'), 'utf8')
    expect(patch).toMatch(/import\('pdfkit\/js\/pdfkit\.standalone'\)/)
  })
})

describe('apps/web/src/lib/export es puro (criterio 16)', () => {
  const files = readdirSync(exportDir).filter((file) => file.endsWith('.ts'))

  it('hay archivos que revisar', () => {
    expect(files.length).toBeGreaterThan(15)
  })

  it('ningún archivo importa Pascal, three, R3F, pdfkit, pdf.js ni React, ni toca el DOM', () => {
    for (const file of files) {
      const source = readFileSync(join(exportDir, file), 'utf8')
      expect(source, file).not.toMatch(/from\s+['"](@pascal-app\/|three|@react-three\/|pdfkit|pdfjs-dist|react)/)
      expect(source, file).not.toMatch(/\b(document|window|navigator)\./)
    }
  })
})
