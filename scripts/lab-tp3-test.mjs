// Corre las pruebas propias del backend de TP3 (pytest) con el entorno que armó `pnpm lab:setup`.
//   pnpm lab:tp3:test
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { labPaths } from './lib/lab-tp3.mjs'

const paths = labPaths(fileURLToPath(new URL('..', import.meta.url)))

if (!existsSync(paths.mainPy) || !existsSync(paths.venvPython)) {
  console.error('\nTodavía no está instalado TP3: corre primero «pnpm lab:setup».')
  process.exit(1)
}

// Esas pruebas no necesitan la clave real (usan datos simulados): sin ella no hay forma de gastar cuota por accidente.
const { GEMINI_API_KEY: _clave, ...env } = process.env
const result = spawnSync(paths.venvPython, ['-m', 'pytest', '-q'], { cwd: paths.backend, env, stdio: 'inherit' })
if (result.error) {
  console.error('\nNo pude arrancar el Python del entorno de TP3: conviene volver a correr «pnpm lab:setup».')
  process.exit(1)
}
process.exit(result.status ?? 1)
