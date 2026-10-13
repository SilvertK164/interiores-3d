// Levanta el backend de TP3 (el de Victoria) en http://localhost:8000, listo para recibir fotos de nuestra web local.
//   pnpm lab:tp3
// La clave de Gemini sale de la variable de entorno GEMINI_API_KEY o de lab/.env.local (formato CLAVE=valor); nunca se imprime.
// Sin clave arranca igual: el análisis responde 503 y el botón de ejemplo del laboratorio sigue funcionando.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { constants } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TP3_PORT, isPortFree, labPaths, parseEnvFile, resolveTp3Env, startupNotes } from './lib/lab-tp3.mjs'

const paths = labPaths(fileURLToPath(new URL('..', import.meta.url)))
// Ruta completa: no todas las terminales de Windows traen System32 en el PATH.
const TASKKILL = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe')

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}

if (!existsSync(paths.mainPy) || !existsSync(paths.venvPython)) {
  fail('Todavía no está instalado TP3: corre primero «pnpm lab:setup».')
}
if (!(await isPortFree(TP3_PORT))) {
  fail(`El puerto ${TP3_PORT} ya está en uso. Quizá TP3 ya está corriendo (abre http://localhost:${TP3_PORT}) o lo ocupa otro programa.`)
}

const fileEnv = existsSync(paths.envFile) ? parseEnvFile(readFileSync(paths.envFile, 'utf8')) : {}
const env = resolveTp3Env(process.env, fileEnv)
for (const line of startupNotes(env)) console.log(line)
console.log('Para detenerlo: Ctrl+C.\n')

const child = spawn(paths.venvPython, ['-m', 'uvicorn', 'main:app', '--port', String(TP3_PORT)], {
  cwd: paths.backend,
  env: { ...process.env, ...env },
  stdio: 'inherit',
})

let stopping = false
/** En Windows, el python del entorno virtual lanza al real como hijo: hay que cerrar todo el árbol, no solo el primero. */
function stop() {
  if (stopping || child.exitCode !== null) return
  stopping = true
  if (process.platform === 'win32') spawnSync(TASKKILL, ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  if (signal in constants.signals) process.on(signal, stop)
}

child.on('error', () => fail('No pude arrancar el Python del entorno de TP3: conviene volver a correr «pnpm lab:setup».'))
child.on('exit', (code) => {
  if (!stopping && code !== 0) {
    console.error('\nTP3 se detuvo con un error. Si habla de módulos que faltan, «pnpm lab:setup» vuelve a instalar las dependencias.')
  }
  process.exit(stopping ? 0 : (code ?? 1))
})
