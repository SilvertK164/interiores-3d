const REQUIRED = ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY']

/** Lee la salida de `supabase status -o env` (líneas CLAVE="valor"). */
export function parseStatusEnv(raw) {
  const out = {}
  for (const line of raw.split('\n')) {
    const m = /^([A-Z0-9_]+)="?(.*?)"?\s*$/.exec(line.trim())
    if (m) out[m[1]] = m[2]
  }
  const missing = REQUIRED.filter((k) => !out[k])
  if (missing.length > 0) {
    throw new Error(`Supabase local no devolvió: ${missing.join(', ')}. ¿Corriste pnpm db:start?`)
  }
  return out
}

const lines = (obj) => `${Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('\n')}\n`

/** Archivos de entorno para desarrollo y pruebas contra Supabase local. */
export function toEnvFiles(status) {
  const url = status.API_URL
  const anon = status.ANON_KEY
  return {
    '.env.test': lines({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY }),
    'apps/api/.env': lines({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, CORS_ORIGINS: 'http://localhost:3000', PORT: '3001' }),
    'apps/web/.env.local': lines({
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
      NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      NEXT_PUBLIC_E2E: '1',
    }),
  }
}
