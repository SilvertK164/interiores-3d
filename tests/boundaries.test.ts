import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Comillas simples o dobles, `from`, `import 'x'`, `import('x')` y `require('x')`; `three` solo o con subruta (three/examples/...).
const IMPORT_SOURCE = "(from|import|require)[[:space:]]*[(]?[[:space:]]*['\"](@pascal-app/|three['\"/]|@react-three/)"

describe('fronteras del editor (decisión D8)', () => {
  it('solo apps/web/src/editor/ importa Pascal, three o R3F desde archivos .ts/.tsx', () => {
    let out = ''
    try {
      out = execFileSync(
        'git',
        ['grep', '-l', '-E', IMPORT_SOURCE, '--', '*.ts', '*.tsx', ':!tests/boundaries.test.ts'],
        { encoding: 'utf8' },
      )
    } catch (e) {
      // git grep sale con 1 cuando no hay coincidencias
      if ((e as { status?: number }).status !== 1) throw e
    }
    // Las pruebas unitarias de apps/web/test pueden armar nodos con los datos puros de Pascal (esquema y constantes del muro:
    // sin three ni R3F). Cualquier otro import de Pascal, three o R3F fuera de src/editor/ sigue siendo una violación.
    const DATA_ONLY = /^@pascal-app\/core\/(schema|wall)$/
    // Un archivo de prueba solo se admite si TODO lo que importa de Pascal/three/R3F es de la lista y encontramos al menos un import:
    // si no se logra leer ninguno, no se da por bueno (antes `every` de una lista vacía daba verdadero).
    const importsOnlyData = (file: string) => {
      const specifiers = [...readFileSync(file, 'utf8').matchAll(/(?:from|import|require)\s*\(?\s*['"]((?:@pascal-app\/|three['"/]|@react-three\/)[^'"]*)/g)].map((m) => m[1] ?? '')
      return specifiers.length > 0 && specifiers.every((specifier) => DATA_ONLY.test(specifier))
    }
    const offenders = out
      .split('\n')
      .filter((f) => f && !f.startsWith('apps/web/src/editor/'))
      .filter((f) => !(f.startsWith('apps/web/test/') && importsOnlyData(f)))
    expect(offenders).toEqual([])
  })
})
