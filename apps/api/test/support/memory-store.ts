import { randomUUID } from 'node:crypto'
import { type ProjectDetail, type SceneEnvelope, emptyEnvelope } from '@interiores/contract'
import type { Ctx, ProjectStore } from '../../src/store.js'

type Row = { id: string; ownerId: string; name: string; kind: 'vivienda' | 'comercio' | null; updatedAt: string; scene: SceneEnvelope; version: number }

/** Réplica en memoria de las reglas de dueño y de versión que aplican RLS y la API real. */
export function createMemoryStore(): ProjectStore & { tick(): void } {
  const rows = new Map<string, Row>()
  let clock = Date.parse('2026-10-11T12:00:00Z')
  const now = () => new Date(clock).toISOString()
  const mine = (ctx: Ctx, id: string) => {
    const row = rows.get(id)
    return row && row.ownerId === ctx.userId ? row : undefined
  }
  const summary = (r: Row) => ({ id: r.id, name: r.name, kind: r.kind, updatedAt: r.updatedAt })

  return {
    tick: () => {
      clock += 60_000
    },
    async list(ctx) {
      return [...rows.values()]
        .filter((r) => r.ownerId === ctx.userId)
        .sort((x, y) => y.updatedAt.localeCompare(x.updatedAt))
        .map(summary)
    },
    async create(ctx, input) {
      clock += 1000
      const row: Row = { id: randomUUID(), ownerId: ctx.userId, name: input.name, kind: input.kind ?? null, updatedAt: now(), scene: emptyEnvelope(), version: 1 }
      rows.set(row.id, row)
      return { id: row.id, name: row.name, kind: row.kind, version: 1 }
    },
    async get(ctx, id) {
      const r = mine(ctx, id)
      return r ? ({ ...summary(r), scene: r.scene, version: r.version } satisfies ProjectDetail) : null
    },
    async update(ctx, id, patch) {
      const r = mine(ctx, id)
      if (!r) return null
      if (patch.name !== undefined) r.name = patch.name
      if (patch.kind !== undefined) r.kind = patch.kind
      clock += 1000
      r.updatedAt = now()
      return summary(r)
    },
    async remove(ctx, id) {
      return mine(ctx, id) ? rows.delete(id) : false
    },
    async saveScene(ctx, id, scene, expectedVersion) {
      const r = mine(ctx, id)
      if (!r) return { kind: 'not_found' }
      if (r.version !== expectedVersion) return { kind: 'conflict' }
      r.scene = scene
      r.version += 1
      clock += 1000
      r.updatedAt = now()
      return { kind: 'ok', version: r.version }
    },
  }
}
