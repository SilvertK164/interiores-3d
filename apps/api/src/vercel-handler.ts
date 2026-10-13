import type { IncomingMessage, ServerResponse } from 'node:http'
import { supabaseAuthVerifier } from './auth.js'
import { LOGGER_REDACT, buildApp } from './build-app.js'
import { type Config, loadConfig } from './config.js'
import { errorBody, errors } from './errors.js'
import { createSupabaseStore } from './supabase-store.js'

type App = ReturnType<typeof buildApp>
export type VercelHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>
export type VercelHandlerOptions = {
  env?: NodeJS.ProcessEnv
  build?: (config: Config) => App
}

/** La misma app que arranca src/index.ts, pero sin `listen`: en Vercel cada petición llega ya armada. */
export function buildProductionApp(config: Config): App {
  return buildApp(
    {
      auth: supabaseAuthVerifier(config.supabaseUrl, config.supabaseAnonKey),
      store: createSupabaseStore(config.supabaseUrl, config.supabaseAnonKey),
      corsOrigins: config.corsOrigins,
    },
    { logger: { level: config.logLevel, redact: LOGGER_REDACT } },
  )
}

/**
 * Manejador de una función de Vercel: arma la app una vez por instancia (el arranque en frío) y le pasa cada
 * petición al servidor HTTP de Fastify. Si la configuración falta responde 500 y deja el motivo, sin valores,
 * en el registro; la petición siguiente vuelve a intentarlo.
 */
export function createVercelHandler({ env = process.env, build = buildProductionApp }: VercelHandlerOptions = {}): VercelHandler {
  let app: App | undefined
  return async (req, res) => {
    let ready: App
    try {
      app ??= build(loadConfig(env))
      ready = app
      await ready.ready()
    } catch (err) {
      app = undefined
      console.error(`[api] no se pudo arrancar: ${err instanceof Error ? err.message : String(err)}`)
      const e = errors.internal()
      res.writeHead(e.status, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(errorBody(e.code, e.message)))
      return
    }
    ready.server.emit('request', req, res)
  }
}
