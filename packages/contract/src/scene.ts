import { z } from 'zod'

export const SCHEMA_VERSION = 1
/** Tope de una escena (JSON). Vercel corta los cuerpos en 4,5 MB; la base lo repite con un check (migración 003). */
export const SCENE_MAX_BYTES = 4 * 1024 * 1024
export const PASCAL_CORE_VERSION = '1.0.3'

export const SceneGraphSchema = z.looseObject({
  nodes: z.record(z.string(), z.unknown()),
  rootNodeIds: z.array(z.string()),
  collections: z.record(z.string(), z.unknown()).optional(),
  materials: z.record(z.string(), z.unknown()).optional(),
  installedPlugins: z.array(z.string()).optional(),
})

export const SceneEnvelopeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  pascal: z.object({ core: z.string().min(1) }),
  graph: SceneGraphSchema,
})

export type SceneGraph = z.infer<typeof SceneGraphSchema>
export type SceneEnvelope = z.infer<typeof SceneEnvelopeSchema>

export function emptyEnvelope(): SceneEnvelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    pascal: { core: PASCAL_CORE_VERSION },
    graph: { nodes: {}, rootNodeIds: [], collections: {}, materials: {}, installedPlugins: [] },
  }
}

export function isEmptyGraph(graph: SceneGraph): boolean {
  return graph.rootNodeIds.length === 0 && Object.keys(graph.nodes).length === 0
}
