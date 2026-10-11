// Lógica pura de `pnpm db:env:cloud`: lee y valida las variables de un proyecto de Supabase en la nube y arma
// los archivos de entorno de desarrollo. Ningún mensaje ni resumen incluye el valor de una clave, ni en pedazos.
import { parseEnv } from 'node:util'

/** Nombres aceptados para la URL: el de la API y el de la web. */
export const URL_VARS = ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']
/** Nombres aceptados para la clave pública: anon (API y web) y publishable (como la llama el panel de Supabase). */
export const KEY_VARS = [
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
]

export class CloudEnvError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CloudEnvError'
  }
}

/** Lee el texto de .env.cloud con el analizador de Node (comentarios, comillas, export y CRLF). */
export const parseCloudFile = (text) => parseEnv(text)

const URL_SHAPE = 'tiene que ser la dirección del proyecto: https:// + referencia + .supabase.co (por ejemplo https://abcdefghijklmnop.supabase.co)'
const PROJECT_HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.supabase\.co$/

/** Devuelve la URL base del proyecto (sin barra final) o lanza un error que no repite lo recibido. */
export function validateSupabaseUrl(value, label = 'SUPABASE_URL') {
  let url
  try {
    url = new URL(String(value ?? '').trim())
  } catch {
    throw new CloudEnvError(`${label} no es válida: ${URL_SHAPE}.`)
  }
  if (url.protocol !== 'https:' || !PROJECT_HOST.test(url.hostname)) {
    throw new CloudEnvError(`${label} no es válida: ${URL_SHAPE}.`)
  }
  if (url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new CloudEnvError(`${label} tiene que ser solo la dirección base del proyecto, sin credenciales, puerto, ruta ni parámetros.`)
  }
  return url.origin
}

/** Rol que declara un JWT, o undefined si no se puede leer. */
function jwtRole(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).role
  } catch {
    return undefined
  }
}

/** Acepta la clave publishable (sb_publishable_) o la anon antigua (JWT con rol anon); rechaza toda clave secreta. */
export function validateAnonKey(value, label = 'SUPABASE_ANON_KEY') {
  const key = String(value ?? '').trim()
  const secret = () =>
    new CloudEnvError(
      `${label} es una clave secreta (service_role o sb_secret_). Esa clave nunca va en la web ni en la API: usa la clave pública (publishable o anon) del mismo proyecto.`,
    )
  const invalid = () =>
    new CloudEnvError(
      `${label} no parece una clave pública de Supabase: tiene que empezar con sb_publishable_ o ser un JWT (empieza con eyJ). Cópiala de Project Settings > API Keys.`,
    )
  if (key.startsWith('sb_secret_')) throw secret()
  if (key.startsWith('sb_publishable_')) {
    if (!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key)) throw invalid()
    return { key, kind: 'publishable' }
  }
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) throw invalid()
  const role = jwtRole(key)
  if (role === 'service_role') throw secret()
  if (role !== 'anon') throw invalid()
  return { key, kind: 'anon' }
}

/** Primer valor no vacío: el entorno manda sobre .env.cloud; dentro de cada fuente, el orden de `names`. */
function pick(names, sources) {
  for (const [source, vars] of sources) {
    for (const name of names) {
      const value = typeof vars[name] === 'string' ? vars[name].trim() : ''
      if (value) return { name, source, value }
    }
  }
  return null
}

/** Lee y valida la configuración. `from` dice de dónde salió cada valor (nunca el valor). */
export function readCloudConfig({ env = {}, file = {} }) {
  const sources = [['entorno', env], ['.env.cloud', file]]
  const url = pick(URL_VARS, sources)
  const key = pick(KEY_VARS, sources)
  const missing = [url ? null : URL_VARS[0], key ? null : KEY_VARS[0]].filter(Boolean)
  if (missing.length > 0) {
    throw new CloudEnvError(
      `${missing.length === 1 ? 'Falta' : 'Faltan'} ${missing.join(' y ')}. Defínelas en tu terminal o en .env.cloud (copia .env.cloud.example y completa los valores; te los pasa Silvert por un canal privado). Guía: docs/nube.md.`,
    )
  }
  const label = (found) => `${found.name} (${found.source})`
  const supabaseUrl = validateSupabaseUrl(url.value, label(url))
  const { key: anonKey, kind } = validateAnonKey(key.value, label(key))
  return { supabaseUrl, anonKey, keyKind: kind, from: { url: label(url), key: label(key) } }
}

const lines = (obj) => `${Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('\n')}\n`
const header = (archivo) =>
  `# Generado por pnpm db:env:cloud: ${archivo} apunta a Supabase en la nube (desarrollo). No lo subas al repositorio. Para volver a la base local: pnpm db:env\n`

/** Archivos de entorno para desarrollar contra Supabase en la nube: sin .env.test y sin clave de servicio. */
export function toCloudEnvFiles({ supabaseUrl, anonKey }) {
  return {
    'apps/api/.env': header('este archivo') +
      lines({ SUPABASE_URL: supabaseUrl, SUPABASE_ANON_KEY: anonKey, CORS_ORIGINS: 'http://localhost:3000', PORT: '3001' }),
    'apps/web/.env.local': header('este archivo') +
      lines({
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      }),
  }
}

export const CLOUD_NOTES = [
  'Con la base en la nube no corren, a propósito:',
  '  - las pruebas de RLS y de integración de la API: usan una clave de servicio que solo existe en la base local;',
  '  - las pruebas E2E de Playwright: crean usuarios con esa clave de servicio.',
  'Para esas pruebas usa la base local: pnpm db:start y pnpm db:env (reescribe estos mismos archivos con las claves locales).',
]

/** Líneas que imprime el comando: proyecto, de dónde se leyó, archivos escritos y avisos. Nunca la clave. */
export function cloudSummary({ supabaseUrl, keyKind, from }, written) {
  return [
    `Supabase en la nube: ${new URL(supabaseUrl).hostname} (clave pública tipo ${keyKind})`,
    `Leído de: ${from.url} y ${from.key}`,
    ...written.map((path) => `escrito ${path}`),
    '',
    ...CLOUD_NOTES,
  ]
}
