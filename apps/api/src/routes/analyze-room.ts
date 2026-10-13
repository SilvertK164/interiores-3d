import { ANALYZE_BODY_MAX_BYTES, type AnalyzeRoomBody, AnalyzeRoomBodySchema } from '@interiores/contract'
import type { FastifyPluginAsync } from 'fastify'
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
 * El cuerpo lleva la foto en base64, así que esta ruta admite más que el tope de 4 MiB de las escenas, y si se pasa el error
 * habla de la foto y no de «la escena» (`config.oversize`, ver build-app.ts).
 */
export const analyzeRoomRoutes: FastifyPluginAsync = async (app) => {
  app.post('/analyze-room', { bodyLimit: ANALYZE_BODY_MAX_BYTES, config: { oversize: 'image' } }, async (req) => {
    parseAnalyzeBody(req.body)
    // El proveedor de visión se conecta en la fase siguiente: hasta entonces el servicio responde que no está disponible.
    throw errors.analysisUnavailable()
  })
}
