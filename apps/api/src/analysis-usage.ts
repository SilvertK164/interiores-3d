import { createClient } from '@supabase/supabase-js'
import type { AnalysisUsage } from './analyze-room/index.js'
import { errors } from './errors.js'
import type { Ctx } from './store.js'

/** SQLSTATE `configuration_limit_exceeded`: lo lanza el disparador de la migración 004 al llegar al intento 11 de la hora. */
const LIMIT_EXCEEDED_SQLSTATE = '53400'

/**
 * Registra cada análisis en `analysis_usage` con el JWT de la persona (RLS: solo inserta a su nombre). El tope de 10 por hora
 * lo aplica el disparador de la base, de modo que dos pedidos simultáneos no puedan pasarlo a la vez; aquí solo se traduce su
 * rechazo al 429. Cualquier otro error se deja subir (500 genérico): sin registro no hay análisis.
 */
export function createSupabaseUsage(url: string, anonKey: string): AnalysisUsage {
  return {
    async consume(ctx: Ctx) {
      const db = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${ctx.token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { error } = await db.from('analysis_usage').insert({ user_id: ctx.userId })
      if (!error) return
      if (error.code === LIMIT_EXCEEDED_SQLSTATE) throw errors.analysisLimit()
      throw new Error(`no se pudo registrar el intento de análisis (${error.code ?? 'sin código'})`)
    },
  }
}
