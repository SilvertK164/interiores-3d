import { type AnalysisDeps, createGeminiProvider } from './analyze-room/index.js'
import { createSupabaseUsage } from './analysis-usage.js'
import type { Config } from './config.js'

/**
 * Lo que necesita el análisis de fotos según la configuración: sin `GEMINI_API_KEY` no hay proveedor y la ruta responde 503
 * (la API arranca igual). Lo comparten el arranque local (`index.ts`) y la función de Vercel (`vercel-handler.ts`).
 */
export function createAnalysisDeps(config: Config, fetchImpl?: typeof fetch): AnalysisDeps {
  return {
    provider: config.geminiApiKey ? createGeminiProvider({ apiKey: config.geminiApiKey, model: config.visionModel, fetchImpl }) : null,
    usage: createSupabaseUsage(config.supabaseUrl, config.supabaseAnonKey),
  }
}
