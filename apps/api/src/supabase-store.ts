import {
  type ProjectDetail,
  type ProjectKind,
  type ProjectSummary,
  type SceneEnvelope,
  SceneEnvelopeSchema,
  emptyEnvelope,
} from '@interiores/contract'
import { createClient } from '@supabase/supabase-js'
import { mapDbError } from './db-errors.js'
import type { Ctx, ProjectStore } from './store.js'

type ProjectRow = { id: string; name: string; kind: ProjectKind | null; template_id: string | null; updated_at: string }

const toSummary = (r: ProjectRow): ProjectSummary => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  templateId: r.template_id,
  updatedAt: new Date(r.updated_at).toISOString(),
})

/** Un cliente por pedido, con el JWT de la persona: RLS decide qué filas existen para ella. */
export function createSupabaseStore(url: string, anonKey: string): ProjectStore {
  const forUser = (ctx: Ctx) =>
    createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${ctx.token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  const COLUMNS = 'id,name,kind,template_id,updated_at'

  return {
    async list(ctx) {
      const { data, error } = await forUser(ctx).from('projects').select(COLUMNS).order('updated_at', { ascending: false })
      if (error) throw mapDbError(error)
      return (data as ProjectRow[]).map(toSummary)
    },

    async create(ctx, input) {
      const db = forUser(ctx)
      const inserted = await db
        .from('projects')
        .insert({ owner_id: ctx.userId, name: input.name, kind: input.kind ?? null, template_id: input.templateId ?? null })
        .select(COLUMNS)
        .single()
      if (inserted.error) throw mapDbError(inserted.error)
      const row = inserted.data as ProjectRow
      const scene = await db.from('project_scenes').insert({ project_id: row.id, scene: emptyEnvelope(), schema_version: 1 })
      if (scene.error) {
        await db.from('projects').delete().eq('id', row.id)
        throw mapDbError(scene.error)
      }
      return { id: row.id, name: row.name, kind: row.kind, templateId: row.template_id, version: 1 }
    },

    async get(ctx, id): Promise<ProjectDetail | null> {
      const db = forUser(ctx)
      const project = await db.from('projects').select(COLUMNS).eq('id', id).maybeSingle()
      if (project.error) throw mapDbError(project.error)
      if (!project.data) return null
      const scene = await db.from('project_scenes').select('scene,version').eq('project_id', id).maybeSingle()
      if (scene.error) throw mapDbError(scene.error)
      if (!scene.data) return null
      return {
        ...toSummary(project.data as ProjectRow),
        scene: SceneEnvelopeSchema.parse(scene.data.scene),
        version: scene.data.version as number,
      }
    },

    async update(ctx, id, patch) {
      const values: Record<string, unknown> = {}
      if (patch.name !== undefined) values.name = patch.name
      if (patch.kind !== undefined) values.kind = patch.kind
      const { data, error } = await forUser(ctx).from('projects').update(values).eq('id', id).select(COLUMNS).maybeSingle()
      if (error) throw mapDbError(error)
      return data ? toSummary(data as ProjectRow) : null
    },

    async remove(ctx, id) {
      const { data, error } = await forUser(ctx).from('projects').delete().eq('id', id).select('id')
      if (error) throw mapDbError(error)
      return (data ?? []).length > 0
    },

    async saveScene(ctx, id, scene: SceneEnvelope, expectedVersion) {
      const db = forUser(ctx)
      const current = await db.from('project_scenes').select('version').eq('project_id', id).maybeSingle()
      if (current.error) throw mapDbError(current.error)
      if (!current.data) return { kind: 'not_found' }
      if (current.data.version !== expectedVersion) return { kind: 'conflict' }
      const updated = await db
        .from('project_scenes')
        .update({ scene, schema_version: scene.schemaVersion, version: expectedVersion + 1 })
        .eq('project_id', id)
        .eq('version', expectedVersion)
        .select('version')
      if (updated.error) throw mapDbError(updated.error)
      if ((updated.data ?? []).length === 0) return { kind: 'conflict' }
      return { kind: 'ok', version: expectedVersion + 1 }
    },
  }
}
