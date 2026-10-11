import {
  PASCAL_CORE_VERSION,
  SCHEMA_VERSION,
  SceneEnvelopeSchema,
  type SceneEnvelope,
  type SceneGraph,
  isEmptyGraph,
} from '@interiores/contract'

export function toEnvelope(graph: SceneGraph): SceneEnvelope {
  return { schemaVersion: SCHEMA_VERSION, pascal: { core: PASCAL_CORE_VERSION }, graph }
}

/** `null` = escena vacía: el editor arranca con su escena por defecto. Pascal migra escenas viejas al cargarlas. */
export function fromEnvelope(envelope: unknown): SceneGraph | null {
  const parsed = SceneEnvelopeSchema.safeParse(envelope)
  if (!parsed.success) throw new Error('La escena guardada no tiene el formato esperado.')
  return isEmptyGraph(parsed.data.graph) ? null : parsed.data.graph
}
