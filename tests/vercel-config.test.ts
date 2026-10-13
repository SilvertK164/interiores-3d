import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ANALYZE_BODY_MAX_BYTES } from '../packages/contract/src/analyze-room.js'

// El despliegue en Vercel no se pudo probar (no hay cuentas): estas pruebas solo cuidan que la configuración
// del repositorio sea coherente consigo misma y con la guía. No prueban a Vercel.
const repo = fileURLToPath(new URL('..', import.meta.url))
const read = (path: string) => readFileSync(join(repo, path), 'utf8')
const json = (path: string) => JSON.parse(read(path)) as Record<string, unknown>

const web = json('apps/web/vercel.json') as Record<string, unknown>
const api = json('apps/api/vercel.json') as Record<string, unknown>
const names = {
  web: json('apps/web/package.json').name as string,
  api: json('apps/api/package.json').name as string,
  contract: json('packages/contract/package.json').name as string,
}
const guide = read('docs/nube.md')

describe('apps/web/vercel.json (proyecto Next.js con Root Directory apps/web)', () => {
  it('instala solo la web y sus dependencias del workspace, con el lockfile', () => {
    expect(web.framework).toBe('nextjs')
    expect(web.installCommand).toBe(`pnpm install --frozen-lockfile --filter ${names.web}...`)
  })

  it('compila el contrato antes que la web', () => {
    expect(web.buildCommand).toBe(`pnpm --filter ${names.contract} build && pnpm --filter ${names.web} build`)
    expect((json('apps/web/package.json').scripts as Record<string, string>).build).toBe('next build')
  })
})

describe('apps/api/vercel.json (función de Vercel con Root Directory apps/api)', () => {
  it('fija el preset "Other" (framework null): la entrada es la función de api/, no la detección de Fastify', () => {
    expect(Object.hasOwn(api, 'framework')).toBe(true)
    expect(api.framework).toBeNull()
  })

  it('instala solo la API y sus dependencias del workspace, y compila el contrato antes', () => {
    expect(api.installCommand).toBe(`pnpm install --frozen-lockfile --filter ${names.api}...`)
    expect(api.buildCommand).toBe(`pnpm --filter ${names.contract} build`)
  })

  it('manda todas las rutas a la función api/index.ts', () => {
    expect(api.rewrites).toEqual([{ source: '/(.*)', destination: '/api' }])
    expect(existsSync(join(repo, 'apps/api/api/index.ts'))).toBe(true)
  })

  it('la función puede durar 60 s (el análisis de fotos espera hasta 55 s a Gemini, con modelos de respaldo) y la ruta de la función existe', () => {
    const functions = api.functions as Record<string, { maxDuration?: number }>
    expect(Object.keys(functions)).toEqual(['api/index.ts'])
    expect(existsSync(join(repo, 'apps/api/api/index.ts'))).toBe(true)
    expect(functions['api/index.ts']?.maxDuration).toBe(60)
    const source = read('apps/api/src/analyze-room/gemini.ts')
    const timeout = Number(/GEMINI_TIMEOUT_MS = ([0-9_]+)/.exec(source)?.[1]?.replaceAll('_', ''))
    expect(timeout).toBeGreaterThan(0)
    expect(timeout).toBeLessThan((functions['api/index.ts']?.maxDuration as number) * 1000)
  })

  it('el cuerpo más grande del análisis cabe en los 4,5 MB que Vercel admite por petición', () => {
    expect(ANALYZE_BODY_MAX_BYTES).toBeLessThan(4_500_000)
  })

  it('publica una carpeta public/ vacía para que no se sirva como archivo estático el código de la API', () => {
    expect(api.outputDirectory).toBe('public')
    expect(existsSync(join(repo, 'apps/api/public/.gitkeep'))).toBe(true)
  })
})

describe('coherencia entre el repositorio y docs/nube.md', () => {
  it('la raíz fija pnpm en packageManager y la guía pide Corepack (sin él Vercel usaría un pnpm viejo)', () => {
    expect(json('package.json').packageManager).toMatch(/^pnpm@/)
    expect(guide).toContain('ENABLE_EXPERIMENTAL_COREPACK')
  })

  it('la guía nombra todas las variables que el código lee en producción', () => {
    const reads: [string, string][] = [
      ['apps/web/src/lib/supabase/browser.ts', 'NEXT_PUBLIC_SUPABASE_URL'],
      ['apps/web/src/lib/supabase/browser.ts', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      ['apps/web/src/lib/api/instance.ts', 'NEXT_PUBLIC_API_URL'],
      ['apps/api/src/config.ts', 'SUPABASE_URL'],
      ['apps/api/src/config.ts', 'SUPABASE_ANON_KEY'],
      ['apps/api/src/config.ts', 'CORS_ORIGINS'],
      ['apps/api/src/config.ts', 'GEMINI_API_KEY'],
      ['apps/api/src/config.ts', 'VISION_MODEL'],
    ]
    for (const [file, name] of reads) {
      expect(read(file), `${file} ya no lee ${name}`).toContain(name)
      expect(guide, `docs/nube.md no menciona ${name}`).toContain(name)
    }
  })

  it('el gancho de las pruebas E2E y la clave de servicio no están entre las variables de Vercel', () => {
    const variablesVercel = guide.split('\n').filter((line) => line.startsWith('| `'))
    expect(variablesVercel.length).toBeGreaterThan(5)
    for (const line of variablesVercel) {
      expect(line.split('|')[1]).not.toMatch(/NEXT_PUBLIC_E2E|SERVICE_ROLE|SECRET/i)
    }
  })

  it('la guía explica el análisis de fotos: la clave de Gemini solo en el proyecto API, la migración 004 y el aviso de privacidad', () => {
    expect(guide).toContain('| `GEMINI_API_KEY` |')
    expect(guide).toContain('| `VISION_MODEL` |')
    expect(guide).toContain('gemini-3.5-flash')
    expect(guide).toMatch(/Migración 004/)
    expect(guide).toMatch(/nivel gratuito[^.]*Google puede usar/)
    expect(guide).toMatch(/Sensitive|Sensible/)
    const web = guide.slice(guide.indexOf('Proyecto web:'), guide.indexOf('Proyecto API:'))
    expect(web).not.toContain('GEMINI')
  })

  it('ningún archivo de configuración ni la guía traen una clave con forma real', () => {
    for (const path of ['apps/web/vercel.json', 'apps/api/vercel.json', '.env.cloud.example', '.env.example', 'docs/nube.md']) {
      const content = read(path)
      expect(content, path).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/)
      expect(content, path).not.toMatch(/sb_(publishable|secret)_[A-Za-z0-9_-]{10,}/)
    }
  })
})
