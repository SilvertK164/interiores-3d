// Piezas puras de los scripts del laboratorio (lab:setup, lab:tp3 y lab:tp3:test): rutas, lectura de lab/.env.local,
// detección de Python y avisos de arranque. Los scripts hacen la parte con efectos (clonar, instalar, arrancar).
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { join } from 'node:path'

export const TP3_REPO_URL = 'https://github.com/vivillalbatevez/Villalba-Tevez-iisaia'
export const TP3_PORT = 8000
/** Origen de nuestra web local: el único que TP3 deja pedir análisis, salvo que lab/.env.local diga otro. */
export const DEFAULT_CORS_ORIGINS = 'http://localhost:3000'
export const MIN_PYTHON = { major: 3, minor: 11 }

/** Dónde queda todo, a partir de la raíz del repositorio. `lab/vendor` y `lab/.env.local` no se versionan. */
export function labPaths(root, platform = process.platform) {
  const vendor = join(root, 'lab', 'vendor')
  const repo = join(vendor, 'Villalba-Tevez-iisaia')
  const backend = join(repo, 'TP3', 'backend')
  const venv = join(vendor, '.venv')
  return {
    vendor,
    repo,
    backend,
    venv,
    mainPy: join(backend, 'main.py'),
    requirements: join(backend, 'requirements.txt'),
    venvPython: platform === 'win32' ? join(venv, 'Scripts', 'python.exe') : join(venv, 'bin', 'python'),
    envFile: join(root, 'lab', '.env.local'),
  }
}

/** Lee un archivo CLAVE=valor: comentarios con #, comillas opcionales, `export` opcional, saltos de Windows y BOM. */
export function parseEnvFile(text) {
  const vars = {}
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    let value = (match[2] ?? '').trim()
    const quoted = value.length >= 2 && (value.at(0) === '"' || value.at(0) === "'") && value.at(-1) === value.at(0)
    if (quoted) value = value.slice(1, -1)
    vars[match[1]] = value
  }
  return vars
}

/**
 * Las variables que se le pasan al backend de TP3. La clave y el modelo salen del entorno o, si faltan, de lab/.env.local
 * (el entorno manda); un valor vacío cuenta como ausente. Los orígenes permitidos solo se cambian desde el archivo, para que
 * una variable `CORS_ORIGINS` de otra aplicación no se cuele aquí.
 */
export function resolveTp3Env(processEnv, fileEnv) {
  const pick = (source, name) => {
    const value = (source[name] ?? '').trim()
    return value === '' ? undefined : value
  }
  const env = { CORS_ORIGINS: pick(fileEnv, 'CORS_ORIGINS') ?? DEFAULT_CORS_ORIGINS }
  for (const name of ['GEMINI_API_KEY', 'VISION_MODEL']) {
    const value = pick(processEnv, name) ?? pick(fileEnv, name)
    if (value) env[name] = value
  }
  return env
}

/** Líneas de la consola al arrancar TP3. Nunca incluyen el valor de la clave. */
export function startupNotes(env) {
  const lines = env.GEMINI_API_KEY
    ? ['Clave de Gemini: encontrada (no se muestra).']
    : [
        'No encontré GEMINI_API_KEY (ni en tu entorno ni en lab/.env.local).',
        'TP3 arranca igual, pero «Analizar foto» responderá el error 503 hasta que la configures.',
        '«Probar con un ejemplo (sin servicio)» en el laboratorio sigue funcionando. Cómo configurar la clave: lab/README.md.',
      ]
  lines.push(env.VISION_MODEL ? `Modelo de visión: ${env.VISION_MODEL}.` : 'Modelo de visión: el que trae TP3 por defecto.')
  lines.push(`TP3 acepta fotos desde: ${env.CORS_ORIGINS}.`)
  lines.push(`TP3 en http://localhost:${TP3_PORT} (su pantalla original sirve para comparar) · laboratorio: http://localhost:3000/laboratorio`)
  return lines
}

/** "Python 3.11.9" → { major: 3, minor: 11 }; cualquier otra cosa (como el aviso de la tienda de Windows) → null. */
export function parsePythonVersion(text) {
  const match = /^Python (\d+)\.(\d+)/.exec(text.trim())
  return match ? { major: Number(match[1]), minor: Number(match[2]) } : null
}

const pythonCandidates = (platform) => (platform === 'win32' ? [['python'], ['py', '-3']] : [['python3'], ['python']])

/** Primer Python 3.11 o superior que responda: `python` o `py -3` en Windows; `python3` o `python` en el resto. */
export function findPython(platform = process.platform, run = spawnSync) {
  for (const [command, ...args] of pythonCandidates(platform)) {
    const result = run(command, [...args, '--version'], { encoding: 'utf8' })
    if (result.error || result.status !== 0) continue
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    const version = parsePythonVersion(output)
    if (!version || version.major !== MIN_PYTHON.major || version.minor < MIN_PYTHON.minor) continue
    return { command, args, version: output.trim().replace(/^Python\s+/, '') }
  }
  return null
}

/** ¿Se puede abrir ese puerto? Sirve para avisar con claridad si TP3 ya está corriendo. */
export function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, host)
  })
}
