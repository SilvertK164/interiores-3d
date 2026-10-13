import { ANALYSES_PER_HOUR } from '@interiores/contract'
import type { AnalysisUsage } from '../../src/analyze-room/index.js'
import { errors } from '../../src/errors.js'
import type { Ctx } from '../../src/store.js'

const HOUR_MS = 60 * 60 * 1000

export type MemoryUsage = AnalysisUsage & {
  /** Intentos de esa persona dentro de la última hora. */
  count(userId: string): number
  /** Avanza el reloj de la réplica. */
  advance(ms: number): void
}

/** Réplica en memoria del disparador de la migración 004: el intento 11 de la última hora de una persona se rechaza con el 429. */
export function createMemoryUsage(limit = ANALYSES_PER_HOUR): MemoryUsage {
  const attempts = new Map<string, number[]>()
  let clock = Date.parse('2026-10-13T12:00:00Z')
  const recent = (userId: string) => (attempts.get(userId) ?? []).filter((at) => at > clock - HOUR_MS)
  return {
    count: (userId) => recent(userId).length,
    advance: (ms) => {
      clock += ms
    },
    async consume(ctx: Ctx) {
      const mine = recent(ctx.userId)
      if (mine.length >= limit) throw errors.analysisLimit()
      attempts.set(ctx.userId, [...mine, clock])
    },
  }
}

/** Para las pruebas que no miran el tope: registra sin rechazar nunca. */
export const unlimitedUsage: AnalysisUsage = { consume: async () => {} }
