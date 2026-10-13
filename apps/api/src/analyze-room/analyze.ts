import { type AnalyzeRoomBody, DetectedFurnitureSchema, type RoomAnalysis, RoomAnalysisSchema } from '@interiores/contract'
import { z } from 'zod'
import { errors } from '../errors.js'
import { ProviderError, type VisionProvider } from './types.js'

/** Un mueble por pieza visible: pasar de esto es un modelo desbocado, no una sala. */
const MAX_FURNITURE = 100
const MAX_WARNINGS = 20
const WARNING_MAX_CHARS = 300

/** Lo que tiene que contestar el modelo: los muebles con los rangos del contrato y avisos (lo demás se descarta). */
const ProviderResultSchema = z.object({
  furniture: z.array(DetectedFurnitureSchema).max(MAX_FURNITURE),
  warnings: z.array(z.string()).default([]),
})

/** Lo único que se le pide al registro: avisar del motivo de una falla, sin su contenido. */
export type AnalysisLog = { warn(fields: { reason: string }, message: string): void }

/** El motivo solo se registra si es una palabra corta de un vocabulario cerrado: así un error mal escrito no filtra la foto. */
const safeReason = (reason: string) => (/^[A-Za-z0-9_:.-]{1,64}$/.test(reason) ? reason : 'unexpected')

const cleanWarnings = (warnings: string[]) =>
  warnings
    .map((text) => text.trim().slice(0, WARNING_MAX_CHARS))
    .filter((text) => text !== '')
    .slice(0, MAX_WARNINGS)

/**
 * Pide el análisis al proveedor y entrega lo que promete el contrato. Cualquier falla (el proveedor, una respuesta con otra
 * forma, un número fuera de rango, un `asset_id` que no estaba en el catálogo recibido) es el mismo 502 `analisis_fallido`;
 * el motivo, una palabra de un vocabulario cerrado, va al registro. Ni el mensaje de un error ajeno ni la respuesta del
 * modelo se registran ni se repiten: podrían traer la foto o el prompt.
 */
export async function analyzeRoom(input: { provider: VisionProvider; body: AnalyzeRoomBody; log?: AnalysisLog }): Promise<RoomAnalysis> {
  const { provider, body, log } = input
  const fail = (reason: string) => {
    log?.warn({ reason: safeReason(reason) }, 'análisis de foto: el proveedor no entregó un resultado válido')
    return errors.analysisFailed()
  }

  let raw: unknown
  try {
    raw = await provider({ image: body.image, mime: body.mime, catalog: body.catalog })
  } catch (error) {
    throw fail(error instanceof ProviderError ? error.reason : 'unexpected')
  }

  const parsed = ProviderResultSchema.safeParse(raw)
  if (!parsed.success) throw fail('invalid_result')
  const allowed = new Set(body.catalog.map((option) => option.id))
  if (parsed.data.furniture.some((piece) => !allowed.has(piece.asset_id))) throw fail('unknown_asset_id')

  return RoomAnalysisSchema.parse({
    furniture: parsed.data.furniture,
    warnings: cleanWarnings(parsed.data.warnings),
    calibration:
      body.knownWidthM === undefined ? { status: 'uncalibrated', width_m: null } : { status: 'user_provided', width_m: body.knownWidthM },
  })
}
