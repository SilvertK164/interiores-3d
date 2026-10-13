import { type AnalyzeRoomBody, type RoomAnalysis, RoomAnalysisSchema } from '@interiores/contract'
import { errors } from '../errors.js'
import { ProviderError, type VisionProvider } from './types.js'

const MAX_WARNINGS = 20
const WARNING_MAX_CHARS = 300

/** Lo único que se le pide al registro: avisar del motivo de una falla, sin su contenido. */
export type AnalysisLog = { warn(fields: { reason: string }, message: string): void }

/** El motivo solo se registra si es una palabra corta de un vocabulario cerrado: así un error mal escrito no filtra la foto. */
const safeReason = (reason: string) => (/^[A-Za-z0-9_:.-]{1,64}$/.test(reason) ? reason : 'unexpected')

const cleanWarnings = (warnings: string[]) =>
  warnings
    .map((text) => text.trim().slice(0, WARNING_MAX_CHARS))
    .filter((text) => text !== '')
    .slice(0, MAX_WARNINGS)

/** Un modelo que no escribe los avisos (la lista vacía) no invalida el plano: se completa antes de validar. */
const withWarnings = (raw: unknown): unknown =>
  typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? { ...raw, warnings: (raw as { warnings?: unknown }).warnings ?? [] } : raw

/**
 * El campo que no cumplió el contrato, como motivo para el registro (`invalid_result:furniture.3.x_m`). La ruta sale solo de los
 * nombres de nuestro esquema y de índices numéricos: nunca trae el contenido de la respuesta.
 */
const invalidReason = (path: readonly PropertyKey[]) => (path.length === 0 ? 'invalid_result' : `invalid_result:${path.map(String).join('.')}`)

/**
 * Pide el análisis al proveedor y entrega lo que promete el contrato: el plano del ambiente visto desde arriba. Cualquier falla (el
 * proveedor, una respuesta con otra forma, un número fuera de rango, una cámara lejos del ambiente, un `on_top_of` que apunta a la
 * nada o forma un ciclo, un `asset_id` que no estaba en el catálogo recibido) es el mismo 502 `analisis_fallido`; el motivo, una
 * palabra de un vocabulario cerrado, va al registro. Ni el mensaje de un error ajeno ni la respuesta del modelo se registran ni se
 * repiten: podrían traer la foto o el prompt.
 */
export async function analyzeRoom(input: { provider: VisionProvider; body: AnalyzeRoomBody; log?: AnalysisLog }): Promise<RoomAnalysis> {
  const { provider, body, log } = input
  const fail = (reason: string) => {
    log?.warn({ reason: safeReason(reason) }, 'análisis de foto: el proveedor no entregó un resultado válido')
    return errors.analysisFailed()
  }

  let raw: unknown
  try {
    raw = await provider({ image: body.image, mime: body.mime, catalog: body.catalog, ...(body.knownWidthM === undefined ? {} : { knownWidthM: body.knownWidthM }) })
  } catch (error) {
    throw fail(error instanceof ProviderError ? error.reason : 'unexpected')
  }

  const parsed = RoomAnalysisSchema.safeParse(withWarnings(raw))
  if (!parsed.success) throw fail(invalidReason(parsed.error.issues[0]?.path ?? []))
  const allowed = new Set(body.catalog.map((option) => option.id))
  if (parsed.data.furniture.some((piece) => !allowed.has(piece.asset_id))) throw fail('unknown_asset_id')

  return { ...parsed.data, warnings: cleanWarnings(parsed.data.warnings) }
}
