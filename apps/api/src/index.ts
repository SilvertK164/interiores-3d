import { supabaseAuthVerifier } from './auth.js'
import { LOGGER_REDACT, buildApp } from './build-app.js'
import { loadConfig } from './config.js'
import { createSupabaseStore } from './supabase-store.js'

const config = loadConfig(process.env)

const app = buildApp(
  {
    auth: supabaseAuthVerifier(config.supabaseUrl, config.supabaseAnonKey),
    store: createSupabaseStore(config.supabaseUrl, config.supabaseAnonKey),
    corsOrigins: config.corsOrigins,
  },
  { logger: { level: config.logLevel, redact: LOGGER_REDACT } },
)

await app.listen({ port: config.port, host: '0.0.0.0' })
