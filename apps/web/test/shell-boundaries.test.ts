import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const webRoot = fileURLToPath(new URL('../', import.meta.url))
const editorDir = join(webRoot, 'src', 'editor')
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : /\.(?:tsx?|mjs|jsx?)$/.test(entry.name) ? [join(dir, entry.name)] : [],
  )
/** Cualquier forma de traer Pascal, three o R3F: `from`, `import 'x'`, `import('x')`, `require('x')`, comillas simples o dobles. */
const PASCAL = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"](?:@pascal-app\/|three(?:['"/])|@react-three\/)/

describe('frontera con Pascal', () => {
  it('la prueba detecta las formas de importar (no pasa por vacío)', () => {
    // Las muestras se arman por partes para que ni esta prueba ni el grep de tests/boundaries.test.ts las confundan con imports reales.
    const s = "'"
    const d = '"'
    const lines = [
      `import { x } from ${s}@pascal-app/core${s}`,
      `import { x } from ${d}@pascal-app/editor${d}`,
      `import * as THREE from ${s}three${s}`,
      `import { y } from ${s}three/examples/jsm/x${s}`,
      `import { Canvas } from ${s}@react-three/fiber${s}`,
      `import ${s}three${s}`,
      `export { z } from ${d}three${d}`,
      `const m = await import(${s}@pascal-app/viewer${s})`,
      `const r = require(${s}three${s})`,
    ]
    for (const line of lines) expect(PASCAL.test(line), line).toBe(true)
    expect(PASCAL.test(`import { cx } from ${s}@/lib/cx${s}`)).toBe(false)
    expect(PASCAL.test(`import x from ${s}three-stdlib-fake${s}`)).toBe(false)
  })

  it('ningún archivo de src/editor/shell importa Pascal, three ni R3F (solo src/editor/pascal-bridge.ts lo hace)', () => {
    const offenders = walk(join(editorDir, 'shell')).filter((file) => PASCAL.test(readFileSync(file, 'utf8')))
    expect(offenders.map((f) => relative(webRoot, f))).toEqual([])
  })

  it('fuera de src/editor (app, src/components, src/lib, ...) nadie importa Pascal, three ni R3F', () => {
    const outside = (f: string) => !f.startsWith(editorDir + sep)
    const files = [...walk(join(webRoot, 'app')), ...walk(join(webRoot, 'src'))].filter(outside)
    const offenders = files.filter((file) => PASCAL.test(readFileSync(file, 'utf8')))
    expect(offenders.map((f) => relative(webRoot, f))).toEqual([])
  })
})
