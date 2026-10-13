import { DEFAULT_VISION_MODEL } from './analyze-room/gemini.js'

export type Config = {
  supabaseUrl: string
  supabaseAnonKey: string
  corsOrigins: string[]
  port: number
  logLevel: string
  /** Clave de Gemini para «Muebles desde una foto». Opcional: sin ella la API arranca y el análisis responde 503. Nunca se imprime. */
  geminiApiKey: string | undefined
  /** Modelo de visión (variable `VISION_MODEL`). */
  visionModel: string
}

/** El navegador envía el origen sin barra final: una barra de más en CORS_ORIGINS lo dejaría sin permiso. */
const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '')

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'].filter((k) => !env[k])
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`)
  }
  return {
    supabaseUrl: env.SUPABASE_URL as string,
    supabaseAnonKey: env.SUPABASE_ANON_KEY as string,
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map(normalizeOrigin).filter(Boolean),
    port: Number(env.PORT ?? 3001),
    logLevel: env.LOG_LEVEL ?? 'info',
    geminiApiKey: env.GEMINI_API_KEY?.trim() || undefined,
    visionModel: env.VISION_MODEL?.trim() || DEFAULT_VISION_MODEL,
  }
}
