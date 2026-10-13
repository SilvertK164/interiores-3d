import { ANALYZE_BODY_MAX_BYTES, type AnalyzeRoomBody, AnalyzeRoomBodySchema } from '@interiores/contract'
import type { FastifyPluginAsync } from 'fastify'
import { type AnalysisDeps, analyzeRoom, decodeImage } from '../analyze-room/index.js'
import { errors } from '../errors.js'

/**
 * Valida el cuerpo contra el contrato y traduce la primera falla a su error en castellano: el catálogo, la foto (tamaño o
 * formato), el ancho conocido o, si el cuerpo ni siquiera es un objeto, un 422 genérico.
 */
export function parseAnalyzeBody(data: unknown): AnalyzeRoomBody {
  const parsed = AnalyzeRoomBodySchema.safeParse(data)
  if (parsed.success) return parsed.data
  const issue = parsed.error.issues[0]
  const field = issue?.path[0]
  if (field === 'catalog') throw errors.invalidCatalog()
  if (field === 'image' && issue?.code === 'too_big') throw errors.imageTooLarge()
  if (field === 'image' || field === 'mime') throw errors.unreadableImage()
  if (field === 'knownWidthM') throw errors.invalid('el ancho conocido debe ser mayor que 0 y de hasta 100 metros')
  throw errors.invalid('el pedido está incompleto')
}

/**
 * `POST /v1/analyze-room` (la sesión la exige el hook de /v1). El orden importa: primero se valida el pedido (lo inválido no
 * cuesta nada), luego se comprueba que haya proveedor configurado y recién después se llama al modelo.
 *
 * El cuerpo lleva la foto en base64, así que esta ruta admite más que el tope de 4 MiB de las escenas, y si se pasa el error
 * habla de la foto y no de «la escena» (`config.oversize`, ver build-app.ts).
 */
export const analyzeRoomRoutes =
  (analysis: AnalysisDeps | undefined): FastifyPluginAsync =>
  async (app) => {
    app.post('/analyze-room', { bodyLimit: ANALYZE_BODY_MAX_BYTES, config: { oversize: 'image' } }, async (req) => {
      const body = parseAnalyzeBody(req.body)
      decodeImage(body.image, body.mime)
      if (!analysis?.provider) throw errors.analysisUnavailable()
      return analyzeRoom({ provider: analysis.provider, body, log: req.log })
    })
  }
