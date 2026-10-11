import { describe, expect, it } from 'vitest'
import { parseStatusEnv, toEnvFiles } from '../scripts/lib/status-env.mjs'

const raw = [
  'API_URL="http://127.0.0.1:54321"',
  'ANON_KEY="anon-demo"',
  'SERVICE_ROLE_KEY="service-demo"',
  'DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"',
  '',
].join('\n')

describe('parseStatusEnv', () => {
  it('lee las variables entre comillas de `supabase status -o env`', () => {
    expect(parseStatusEnv(raw)).toMatchObject({ API_URL: 'http://127.0.0.1:54321', ANON_KEY: 'anon-demo', SERVICE_ROLE_KEY: 'service-demo' })
  })

  it('falla de forma visible si falta la URL o alguna clave', () => {
    expect(() => parseStatusEnv('API_URL="http://x"\n')).toThrow('ANON_KEY, SERVICE_ROLE_KEY')
  })
})

describe('toEnvFiles', () => {
  const files = toEnvFiles(parseStatusEnv(raw))

  it('arma .env.test con las tres variables de pruebas', () => {
    expect(files['.env.test']).toContain('SUPABASE_SERVICE_ROLE_KEY=service-demo')
  })

  it('el .env de la API no recibe la clave service_role', () => {
    expect(files['apps/api/.env']).toContain('SUPABASE_ANON_KEY=anon-demo')
    expect(files['apps/api/.env']).not.toContain('service')
  })

  it('el .env.local de la web usa variables públicas y activa el gancho E2E', () => {
    expect(files['apps/web/.env.local']).toContain('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321')
    expect(files['apps/web/.env.local']).toContain('NEXT_PUBLIC_E2E=1')
    expect(files['apps/web/.env.local']).not.toContain('service')
  })
})
