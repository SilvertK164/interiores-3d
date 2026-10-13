import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fromRoot = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url))
const PATCH_FILE = 'patches/@react-three__drei@10.7.9.patch'
const dreiDir = dirname(createRequire(import.meta.url).resolve('@react-three/drei/package.json'))

describe('parche de @react-three/drei (Html desmonta su raíz fuera del render)', () => {
  it('drei sigue fijado en 10.7.9 y el parche está registrado en pnpm-workspace.yaml', () => {
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))
    expect(pkg.dependencies['@react-three/drei']).toBe('10.7.9')
    expect(readFileSync(fromRoot('pnpm-workspace.yaml'), 'utf8')).toMatch(
      /'?@react-three\/drei@10\.7\.9'?:\s*patches\/@react-three__drei@10\.7\.9\.patch/,
    )
    expect(existsSync(fromRoot(PATCH_FILE))).toBe(true)
  })

  it('el paquete instalado no desmonta la raíz de Html de forma síncrona (React 19 avisa "unmount a root while React was already rendering")', () => {
    const html = readFileSync(join(dreiDir, 'web', 'Html.js'), 'utf8')
    expect(html).toContain('queueMicrotask')
    expect(html).toContain('__madoriRoot')
  })

  it('el archivo del parche guarda ese cambio (si node_modules se regenera, vuelve)', () => {
    expect(readFileSync(fromRoot(PATCH_FILE), 'utf8')).toMatch(/^\+.*queueMicrotask/m)
  })
})
