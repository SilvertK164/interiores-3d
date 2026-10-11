// Prepara el laboratorio: descarga el TP3 de Victoria en lab/vendor y le arma su entorno de Python.
//   pnpm lab:setup      (se puede repetir: actualiza el código de TP3 y vuelve a instalar sus dependencias)
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MIN_PYTHON, TP3_REPO_URL, findPython, labPaths } from './lib/lab-tp3.mjs'

const paths = labPaths(fileURLToPath(new URL('..', import.meta.url)))

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}

/** Corre un comando mostrando su salida; si falla, termina con el mensaje que explica qué hacer. */
function run(command, args, failure) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error || result.status !== 0) fail(failure)
}

console.log('Paso 1 de 3: código de TP3 (lab/vendor/Villalba-Tevez-iisaia)')
if (spawnSync('git', ['--version'], { stdio: 'ignore' }).status !== 0) {
  fail('No encontré git. Se instala desde https://git-scm.com/downloads y después se puede volver a correr «pnpm lab:setup».')
}
if (existsSync(join(paths.repo, '.git'))) {
  console.log('Ya está descargado: busco novedades.')
  run(
    'git',
    ['-C', paths.repo, 'pull', '--ff-only'],
    'No pude actualizar el código de TP3 (puede haber cambios locales en lab/vendor). Borrar la carpeta lab/vendor/Villalba-Tevez-iisaia y volver a correr «pnpm lab:setup» lo descarga de nuevo.',
  )
} else {
  mkdirSync(paths.vendor, { recursive: true })
  run(
    'git',
    ['clone', '--depth', '1', TP3_REPO_URL, paths.repo],
    `No pude descargar ${TP3_REPO_URL}. Conviene revisar la conexión y que esa dirección abra en el navegador.`,
  )
}
if (!existsSync(paths.mainPy)) {
  fail('Descargué el repositorio, pero no encontré TP3/backend/main.py. Quizá cambió su estructura: vale la pena revisar lab/vendor/Villalba-Tevez-iisaia.')
}

console.log('\nPaso 2 de 3: entorno de Python (lab/vendor/.venv)')
if (existsSync(paths.venvPython)) {
  console.log('Ya existe.')
} else {
  const python = findPython()
  if (!python) {
    fail(
      `No encontré Python ${MIN_PYTHON.major}.${MIN_PYTHON.minor} o superior (probé «python» y «py»). Se instala desde https://www.python.org/downloads/ marcando «Add python.exe to PATH», y después se puede volver a correr «pnpm lab:setup».`,
    )
  }
  console.log(`Uso Python ${python.version} (${[python.command, ...python.args].join(' ')}).`)
  run(
    python.command,
    [...python.args, '-m', 'venv', paths.venv],
    'No pude crear el entorno virtual de Python. En Linux puede faltar el paquete python3-venv.',
  )
}

console.log('\nPaso 3 de 3: dependencias de TP3 (pip)')
run(
  paths.venvPython,
  ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', paths.requirements],
  'No pude instalar las dependencias de TP3. Suele ser la conexión; se puede volver a correr «pnpm lab:setup».',
)

console.log('\nListo. Siguiente paso: pnpm lab:tp3 (levanta el servicio de TP3 en http://localhost:8000).')
