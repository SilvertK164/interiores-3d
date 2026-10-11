import { describe, expect, it } from 'vitest'
import {
  CLOUD_NOTES,
  CloudEnvError,
  KEY_VARS,
  URL_VARS,
  parseCloudFile,
  readCloudConfig,
  toCloudEnvFiles,
  validateAnonKey,
  validateSupabaseUrl,
} from '../scripts/lib/cloud-env.mjs'
import { parseStatusEnv, toEnvFiles } from '../scripts/lib/status-env.mjs'

// Todo lo de abajo es inventado: ninguna clave real. Los JWT se arman en tiempo de ejecución.
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
const fakeJwt = (role: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ iss: 'supabase', ref: 'abcdefghijklmnop', role })}.firmaInventadaParaLasPruebas_01`
const ANON_JWT = fakeJwt('anon')
const PUBLISHABLE = 'sb_publishable_InventadaParaLasPruebas0123456789'
const URL_OK = 'https://abcdefghijklmnop.supabase.co'

function messageOf(fn: () => unknown): string {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(CloudEnvError)
    return (error as Error).message
  }
  throw new Error('se esperaba un error y no hubo ninguno')
}

describe('parseCloudFile', () => {
  it('lee .env.cloud con comentarios, comillas, export y saltos de línea de Windows', () => {
    const text = `# comentario\r\nSUPABASE_URL=${URL_OK}\r\nexport SUPABASE_ANON_KEY="${PUBLISHABLE}" # nota\r\n\r\n`
    expect(parseCloudFile(text)).toEqual({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: PUBLISHABLE })
  })
})

describe('validateSupabaseUrl', () => {
  it('acepta la URL https del proyecto y la deja sin barra final', () => {
    expect(validateSupabaseUrl(URL_OK)).toBe(URL_OK)
    expect(validateSupabaseUrl(`  ${URL_OK}/  `)).toBe(URL_OK)
  })

  it.each([
    ['http plano', 'http://abcdefghijklmnop.supabase.co'],
    ['la base local', 'http://127.0.0.1:54321'],
    ['otro dominio', 'https://abcdefghijklmnop.supabase.com'],
    ['solo el dominio, sin proyecto', 'https://supabase.co'],
    ['dominio que solo parece de Supabase', 'https://abcdefghijklmnop.supabase.co.malo.example'],
    ['con ruta de la API', `${URL_OK}/rest/v1/`],
    ['con parámetros', `${URL_OK}?a=1`],
    ['con puerto', `${URL_OK}:8443`],
    ['con usuario y contraseña', 'https://usuario:secretoSecreto@abcdefghijklmnop.supabase.co'],
    ['el marcador del ejemplo', 'https://<ref-del-proyecto>.supabase.co'],
    ['texto cualquiera', 'esto no es una dirección'],
  ])('rechaza %s', (_caso, value) => {
    expect(() => validateSupabaseUrl(value)).toThrow(CloudEnvError)
  })

  it('el mensaje explica cómo debe ser y nunca repite lo que pegaste', () => {
    const message = messageOf(() => validateSupabaseUrl('https://UsuarioMarcado9:SecretoMarcado9@abcdefghijklmnop.supabase.co'))
    expect(message).toContain('solo la dirección base')
    expect(message).not.toContain('SecretoMarcado9')
    expect(message).not.toContain('UsuarioMarcado9')
    expect(messageOf(() => validateSupabaseUrl('http://abcdefghijklmnop.supabase.co'))).toContain('.supabase.co')
  })
})

describe('validateAnonKey', () => {
  it('acepta la clave publishable (sb_publishable_)', () => {
    expect(validateAnonKey(PUBLISHABLE)).toEqual({ key: PUBLISHABLE, kind: 'publishable' })
  })

  it('acepta la clave anon antigua (JWT con rol anon)', () => {
    expect(validateAnonKey(` ${ANON_JWT}\n`)).toEqual({ key: ANON_JWT, kind: 'anon' })
  })

  it('rechaza las claves de servicio: sb_secret_ y JWT con rol service_role', () => {
    const secret = 'sb_secret_InventadaParaLasPruebas0123456789'
    const service = fakeJwt('service_role')
    for (const value of [secret, service]) {
      const message = messageOf(() => validateAnonKey(value))
      expect(message).toContain('clave secreta')
      expect(message).not.toContain(value)
      for (const part of value.split('.')) expect(message).not.toContain(part)
    }
  })

  it.each([
    ['un JWT de sesión (rol authenticated)', fakeJwt('authenticated')],
    ['un JWT sin rol', `${b64({ alg: 'HS256' })}.${b64({ iss: 'supabase' })}.firmaInventada`],
    ['un JWT roto', 'aaa.bbb.ccc'],
    ['texto cualquiera', 'esto no es una clave'],
    ['el marcador del ejemplo', '<clave-publica-publishable-o-anon>'],
    ['un prefijo solo', 'sb_publishable_'],
    ['vacío', ''],
  ])('rechaza %s', (_caso, value) => {
    expect(() => validateAnonKey(value)).toThrow(CloudEnvError)
  })

  it('el mensaje de una clave inválida no la repite ni en pedazos', () => {
    const value = 'sb_publishable_con espacios y MarcaPrivada123'
    const message = messageOf(() => validateAnonKey(value))
    expect(message).toContain('sb_publishable_')
    expect(message).not.toContain('MarcaPrivada123')
  })
})

describe('readCloudConfig', () => {
  it('lee las variables del entorno', () => {
    const config = readCloudConfig({ env: { SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: PUBLISHABLE } })
    expect(config).toMatchObject({ supabaseUrl: URL_OK, anonKey: PUBLISHABLE, keyKind: 'publishable' })
    expect(config.from).toEqual({ url: 'SUPABASE_URL (entorno)', key: 'SUPABASE_ANON_KEY (entorno)' })
  })

  it('lee de .env.cloud cuando el entorno no las trae', () => {
    const config = readCloudConfig({ env: {}, file: { SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: ANON_JWT } })
    expect(config).toMatchObject({ supabaseUrl: URL_OK, anonKey: ANON_JWT, keyKind: 'anon' })
    expect(config.from.url).toBe('SUPABASE_URL (.env.cloud)')
  })

  it('el entorno manda sobre .env.cloud', () => {
    const otra = 'https://zzzzzzzzzzzzzzzz.supabase.co'
    const config = readCloudConfig({
      env: { SUPABASE_URL: URL_OK },
      file: { SUPABASE_URL: otra, SUPABASE_ANON_KEY: PUBLISHABLE },
    })
    expect(config.supabaseUrl).toBe(URL_OK)
    expect(config.anonKey).toBe(PUBLISHABLE)
  })

  it('acepta los nombres que usa cada app y el de la clave publishable', () => {
    expect(URL_VARS).toEqual(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'])
    expect(KEY_VARS).toEqual([
      'SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ])
    const config = readCloudConfig({
      env: { NEXT_PUBLIC_SUPABASE_URL: URL_OK, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE },
    })
    expect(config).toMatchObject({ supabaseUrl: URL_OK, anonKey: PUBLISHABLE })
  })

  it('ignora valores vacíos', () => {
    const config = readCloudConfig({
      env: { SUPABASE_URL: '  ', SUPABASE_ANON_KEY: '' },
      file: { SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: PUBLISHABLE },
    })
    expect(config.supabaseUrl).toBe(URL_OK)
  })

  it('si falta todo, dice qué falta y dónde ponerlo', () => {
    const message = messageOf(() => readCloudConfig({ env: {}, file: {} }))
    expect(message).toContain('SUPABASE_URL')
    expect(message).toContain('SUPABASE_ANON_KEY')
    expect(message).toContain('.env.cloud')
    expect(message).toContain('docs/nube.md')
  })

  it('si falta solo la clave, nombra solo la clave', () => {
    const message = messageOf(() => readCloudConfig({ env: { SUPABASE_URL: URL_OK } }))
    expect(message).toMatch(/^Falta SUPABASE_ANON_KEY/)
  })

  it('un valor inválido indica de dónde salió (para detectar variables viejas en la terminal) sin mostrarlo', () => {
    const message = messageOf(() =>
      readCloudConfig({
        env: { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_ANON_KEY: PUBLISHABLE },
        file: { SUPABASE_URL: URL_OK },
      }),
    )
    expect(message).toContain('SUPABASE_URL (entorno)')
    expect(message).not.toContain('54321')
  })

  it('con una clave de servicio en la variable pública se niega y no la imprime', () => {
    const service = fakeJwt('service_role')
    const message = messageOf(() => readCloudConfig({ env: { SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: service } }))
    expect(message).toContain('SUPABASE_ANON_KEY (entorno)')
    for (const part of service.split('.')) expect(message).not.toContain(part)
  })
})

describe('toCloudEnvFiles', () => {
  const files = toCloudEnvFiles({ supabaseUrl: URL_OK, anonKey: PUBLISHABLE })
  const names = (content: string) =>
    content
      .split('\n')
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0])

  it('escribe solo la API y la web: nunca .env.test ni la clave de servicio', () => {
    expect(Object.keys(files).sort()).toEqual(['apps/api/.env', 'apps/web/.env.local'])
    for (const content of Object.values(files)) expect(content.toLowerCase()).not.toContain('service')
  })

  it('el .env de la API apunta a la nube y conserva CORS y puerto locales', () => {
    expect(files['apps/api/.env']).toContain(`SUPABASE_URL=${URL_OK}\n`)
    expect(files['apps/api/.env']).toContain(`SUPABASE_ANON_KEY=${PUBLISHABLE}\n`)
    expect(files['apps/api/.env']).toContain('CORS_ORIGINS=http://localhost:3000\n')
    expect(files['apps/api/.env']).toContain('PORT=3001\n')
  })

  it('el .env.local de la web usa variables públicas y la API local, sin el gancho E2E', () => {
    const web = files['apps/web/.env.local']
    expect(web).toContain(`NEXT_PUBLIC_SUPABASE_URL=${URL_OK}\n`)
    expect(web).toContain(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${PUBLISHABLE}\n`)
    expect(web).toContain('NEXT_PUBLIC_API_URL=http://localhost:3001\n')
    expect(web).not.toContain('NEXT_PUBLIC_E2E')
  })

  it('usa los mismos nombres de variables que escribe pnpm db:env (la base local)', () => {
    const local = toEnvFiles(
      parseStatusEnv('API_URL="http://127.0.0.1:54321"\nANON_KEY="a"\nSERVICE_ROLE_KEY="s"\n'),
    )
    expect(names(files['apps/api/.env'])).toEqual(names(local['apps/api/.env']))
    expect(names(files['apps/web/.env.local'])).toEqual(
      names(local['apps/web/.env.local']).filter((name) => name !== 'NEXT_PUBLIC_E2E'),
    )
  })

  it('los archivos dicen que apuntan a la nube y cómo volver a la base local', () => {
    for (const content of Object.values(files)) {
      expect(content.split('\n')[0]).toMatch(/^# .*nube/i)
      expect(content).toContain('pnpm db:env')
    }
  })
})

describe('CLOUD_NOTES', () => {
  it('avisa en castellano que RLS y Playwright solo corren con la base local', () => {
    const text = CLOUD_NOTES.join('\n')
    expect(text).toContain('RLS')
    expect(text).toContain('Playwright')
    expect(text).toContain('pnpm db:start')
    expect(text).toContain('pnpm db:env')
  })
})
