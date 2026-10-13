import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { KEY_VARS, URL_VARS, toCloudEnvFiles } from '../scripts/lib/cloud-env.mjs'

const repo = fileURLToPath(new URL('..', import.meta.url))
const script = join(repo, 'scripts', 'cloud-env.mjs')

// Valores inventados: ninguna clave real.
const URL_OK = 'https://abcdefghijklmnop.supabase.co'
const PUBLISHABLE = 'sb_publishable_InventadaParaLasPruebas0123456789'
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
const SERVICE_JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role: 'service_role' })}.firmaInventadaParaLasPruebas_01`

let root = ''
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cloud-env-'))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

/** Corre el comando contra una carpeta temporal (--root) con un entorno limpio de variables de Supabase. */
function run(env: Record<string, string> = {}) {
  const clean = { ...process.env }
  for (const name of [...URL_VARS, ...KEY_VARS]) delete clean[name]
  const result = spawnSync(process.execPath, [script, `--root=${root}`], { env: { ...clean, ...env }, encoding: 'utf8' })
  return { status: result.status, out: result.stdout, err: result.stderr }
}
const written = (path: string) => join(root, path)

describe('pnpm db:env:cloud', () => {
  it('escribe los archivos de la API y la web con lo que hay en el entorno, sin imprimir la clave', () => {
    const { status, out, err } = run({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: PUBLISHABLE })
    expect(status).toBe(0)
    const expected = toCloudEnvFiles({ supabaseUrl: URL_OK, anonKey: PUBLISHABLE })
    expect(readFileSync(written('apps/api/.env'), 'utf8')).toBe(expected['apps/api/.env'])
    expect(readFileSync(written('apps/web/.env.local'), 'utf8')).toBe(expected['apps/web/.env.local'])
    expect(existsSync(written('.env.test'))).toBe(false)
    expect(out).toContain('abcdefghijklmnop.supabase.co')
    expect(out).toContain('escrito apps/api/.env')
    expect(out).toContain('Playwright')
    expect(out + err).not.toContain(PUBLISHABLE)
    expect(out + err).not.toContain('InventadaParaLasPruebas')
  })

  it('lee .env.cloud (con saltos de línea de Windows) y el entorno manda sobre el archivo', () => {
    const otra = 'https://zzzzzzzzzzzzzzzz.supabase.co'
    writeFileSync(written('.env.cloud'), `SUPABASE_URL=${otra}\r\nSUPABASE_ANON_KEY=${PUBLISHABLE}\r\n`)
    const delArchivo = run()
    expect(delArchivo.status).toBe(0)
    expect(readFileSync(written('apps/api/.env'), 'utf8')).toContain(`SUPABASE_URL=${otra}\n`)

    const delEntorno = run({ SUPABASE_URL: URL_OK })
    expect(delEntorno.status).toBe(0)
    expect(readFileSync(written('apps/api/.env'), 'utf8')).toContain(`SUPABASE_URL=${URL_OK}\n`)
    expect(readFileSync(written('apps/web/.env.local'), 'utf8')).toContain(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${PUBLISHABLE}\n`)
  })

  it('sin valores falla en castellano, apunta a la guía y no escribe nada', () => {
    const { status, err } = run()
    expect(status).toBe(1)
    expect(err).toContain('Faltan SUPABASE_URL y SUPABASE_ANON_KEY')
    expect(err).toContain('docs/nube.md')
    expect(existsSync(written('apps'))).toBe(false)
  })

  it('con una clave de servicio se niega, sin repetirla, y no escribe nada', () => {
    const { status, out, err } = run({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: SERVICE_JWT })
    expect(status).toBe(1)
    expect(err).toContain('clave secreta')
    for (const part of SERVICE_JWT.split('.')) expect(out + err).not.toContain(part)
    expect(existsSync(written('apps'))).toBe(false)
  })

  it('reemplaza lo que hubiera en esos archivos (por ejemplo los de la base local)', () => {
    mkdirSync(written('apps/api'), { recursive: true })
    writeFileSync(written('apps/api/.env'), 'SUPABASE_URL=http://127.0.0.1:54321\n')
    expect(run({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: PUBLISHABLE }).status).toBe(0)
    expect(readFileSync(written('apps/api/.env'), 'utf8')).not.toContain('127.0.0.1')
  })
})

describe('archivos de ejemplo y secretos', () => {
  it('.env.cloud.example copiado tal cual no se acepta: tiene que completarse', () => {
    writeFileSync(written('.env.cloud'), readFileSync(join(repo, '.env.cloud.example'), 'utf8'))
    const { status, err } = run()
    expect(status).toBe(1)
    expect(err).toContain('SUPABASE_URL (.env.cloud)')
    expect(existsSync(written('apps'))).toBe(false)
  })

  it('.env.cloud no se sube a git y el ejemplo sí', () => {
    const ignored = (path: string) => spawnSync('git', ['check-ignore', '-q', path], { cwd: repo }).status
    expect(ignored('.env.cloud')).toBe(0)
    expect(ignored('.env.cloud.example')).toBe(1)
  })

  it('el ejemplo no trae ninguna clave con forma real', () => {
    const example = readFileSync(join(repo, '.env.cloud.example'), 'utf8')
    expect(example).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/)
    expect(example).not.toMatch(/sb_(publishable|secret)_[A-Za-z0-9_-]{10,}/)
    expect(example).toContain('SUPABASE_URL=')
    expect(example).toContain('SUPABASE_ANON_KEY=')
  })

  it('package.json expone el comando como pnpm db:env:cloud', () => {
    const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    expect(pkg.scripts['db:env:cloud']).toBe('node scripts/cloud-env.mjs')
  })
})
