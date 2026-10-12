import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../src/editor/shell/', import.meta.url))
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [],
  )
const PASCAL = /(?:from|import\()\s*'(?:@pascal-app\/|three['/]|@react-three\/)/

describe('frontera del shell con Pascal', () => {
  it('ningún archivo de src/editor/shell importa Pascal, three ni R3F (solo src/editor/pascal-bridge.ts lo hace)', () => {
    const offenders = walk(root).filter((file) => PASCAL.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
