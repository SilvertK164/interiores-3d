import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('fronteras del editor (decisión D8)', () => {
  it('solo apps/web/src/editor/ importa Pascal, three o R3F desde archivos .ts/.tsx', () => {
    let out = ''
    try {
      out = execFileSync(
        'git',
        ['grep', '-l', '-E', "(from|import\\() *'(@pascal-app/|three'|@react-three/)", '--', '*.ts', '*.tsx', ':!tests/boundaries.test.ts'],
        { encoding: 'utf8' },
      )
    } catch (e) {
      // git grep sale con 1 cuando no hay coincidencias
      if ((e as { status?: number }).status !== 1) throw e
    }
    const offenders = out.split('\n').filter((f) => f && !f.startsWith('apps/web/src/editor/'))
    expect(offenders).toEqual([])
  })
})
