import {
  PASCAL_CORE_VERSION,
  SCHEMA_VERSION,
  SceneEnvelopeSchema,
  type SceneEnvelope,
  type SceneGraph,
  isEmptyGraph,
} from '@interiores/contract'
import { refreshItemAssets } from './item-assets'

export function toEnvelope(graph: SceneGraph): SceneEnvelope {
  return { schemaVersion: SCHEMA_VERSION, pascal: { core: PASCAL_CORE_VERSION }, graph }
}

/** `null` = escena vacía: el editor arranca con su escena por defecto. Pascal migra escenas viejas al cargarlas. */
export function fromEnvelope(envelope: unknown): SceneGraph | null {
  const parsed = SceneEnvelopeSchema.safeParse(envelope)
  if (!parsed.success) throw new Error('La escena guardada no tiene el formato esperado.')
  // Los muebles ya guardados llevan rutas de archivos de cuando se crearon: se actualizan a las vigentes.
  return isEmptyGraph(parsed.data.graph) ? null : refreshItemAssets(parsed.data.graph)
}
