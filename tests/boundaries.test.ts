import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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
    // Las pruebas unitarias de apps/web/test pueden armar nodos con los datos puros de Pascal (esquema y constantes del muro:
    // sin three ni R3F). Cualquier otro import de Pascal, three o R3F fuera de src/editor/ sigue siendo una violación.
    const DATA_ONLY = /^@pascal-app\/core\/(schema|wall)$/
    const importsOnlyData = (file: string) => {
      const specifiers = [...readFileSync(file, 'utf8').matchAll(/(?:from|import\() *'((?:@pascal-app\/|three'|@react-three\/)[^']*)/g)].map((m) => m[1] ?? '')
      return specifiers.every((specifier) => DATA_ONLY.test(specifier))
    }
    const offenders = out
      .split('\n')
      .filter((f) => f && !f.startsWith('apps/web/src/editor/'))
      .filter((f) => !(f.startsWith('apps/web/test/') && importsOnlyData(f)))
    expect(offenders).toEqual([])
  })
})
