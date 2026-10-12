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
export const PASCAL = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"](?:@pascal-app\/|three(?:['"/])|@react-three\/)/

describe('frontera con Pascal', () => {
  it('la prueba detecta las formas de importar (no pasa por vacío)', () => {
    for (const line of [
      `import { x } from '@pascal-app/core'`,
      `import { x } from "@pascal-app/editor"`,
      `import * as THREE from 'three'`,
      `import { y } from 'three/examples/jsm/x'`,
      `import { Canvas } from '@react-three/fiber'`,
      `import 'three'`,
      `export { z } from "three"`,
      `const m = await import('@pascal-app/viewer')`,
      `const r = require('three')`,
    ])
      expect(PASCAL.test(line), line).toBe(true)
    expect(PASCAL.test(`import { cx } from '@/lib/cx'`)).toBe(false)
    expect(PASCAL.test(`import x from 'three-stdlib-fake'`)).toBe(false)
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
