import { z } from 'zod'
import { normalizeServiceUrl } from './form-helpers'
import { LabError } from './lab-error'
import { type RoomAnalysis, RoomAnalysisSchema } from './schema'

export const ANALYZE_PATH = '/api/analyze-room'
/** TP3 espera a Gemini hasta 45 s; este margen cubre la subida de la foto y un reintento lento. */
export const DEFAULT_TIMEOUT_MS = 90_000

export type AnalyzeRoomOptions = {
  /** Dirección del servicio de TP3, por ejemplo `http://localhost:8000`. */
  baseUrl: string
  /** Ancho conocido del ambiente en metros; si no se indica, TP3 responde sin calibrar. */
  knownWidthM?: number | null
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

/** Un mensaje por cada código de error que documenta TP3; el texto técnico original no se muestra. */
const TP3_MESSAGES: Record<string, string> = {
  invalid_file_type: 'TP3 no aceptó el formato de la foto: funciona con imágenes JPG, PNG o WebP.',
  file_too_large: 'La foto supera el tamaño máximo que acepta TP3 (8 MB por defecto). Puedes probar con una más liviana.',
  invalid_calibration: 'TP3 no aceptó el ancho conocido: acepta anchos entre 0 y 100 metros.',
  image_unreadable: 'TP3 no pudo leer la foto: el archivo parece dañado o no es realmente una imagen del formato que indica su extensión.',
  provider_failure:
    'TP3 se conectó con Gemini, pero el análisis falló o la respuesta no sirvió. Suele resolverse esperando un momento y volviendo a intentar; si se repite, vale la pena revisar la clave y la cuota en Google AI Studio.',
  provider_not_configured:
    'El servicio de TP3 está corriendo, pero no tiene la clave de Gemini (GEMINI_API_KEY). Puedes configurarla como explica lab/README.md y reiniciar «pnpm lab:tp3». Mientras tanto, «Probar con un ejemplo (sin servicio)» sigue funcionando.',
}

const Tp3ErrorSchema = z.object({ error: z.object({ code: z.string() }) })

async function failureOf(response: Response, base: string): Promise<LabError> {
  const parsed = Tp3ErrorSchema.safeParse(await response.json().catch(() => null))
  const code = parsed.success ? parsed.data.error.code : null
  const message = code ? TP3_MESSAGES[code] : undefined
  if (code && message) return new LabError(message, code, response.status)
  if (!parsed.success && response.status === 404) {
    return new LabError(
      `Esa dirección no parece ser la del servicio de TP3: no encontramos ${ANALYZE_PATH} en ${base}. Conviene revisar que apunte al backend de TP3.`,
      'direccion_incorrecta',
      404,
    )
  }
  return new LabError(`El servicio de TP3 respondió con un error inesperado (código ${response.status}).`, code ?? 'error_inesperado', response.status)
}

/**
 * Envía la foto a TP3 y devuelve su análisis ya validado. Todo lo que puede salir mal (sin conexión, un código de error de TP3,
 * una respuesta con otro formato, espera agotada) llega como un `LabError` con un mensaje en castellano llano.
 */
export async function analyzeRoom(file: Blob, opts: AnalyzeRoomOptions): Promise<RoomAnalysis> {
  const base = normalizeServiceUrl(opts.baseUrl)
  const doFetch = opts.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const form = new FormData()
  form.append('image', file)
  if (opts.knownWidthM != null) form.append('known_width_m', String(opts.knownWidthM))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response: Response
    try {
      response = await doFetch(`${base}${ANALYZE_PATH}`, { method: 'POST', body: form, signal: controller.signal })
    } catch {
      // El navegador no distingue un servicio apagado de un bloqueo por CORS: el mensaje cubre las dos causas.
      throw controller.signal.aborted
        ? new LabError(
            `TP3 tardó demasiado en responder (más de ${Math.round(timeoutMs / 1000)} segundos). El análisis con Gemini a veces demora; puedes volver a intentar.`,
            'tiempo_agotado',
          )
        : new LabError(
            `No pudimos conectar con el servicio de TP3 en ${base}: no está corriendo o no responde. Se levanta con «pnpm lab:tp3» (los pasos están en lab/README.md). Si ya está corriendo, puede que no permita pedidos desde esta página (variable CORS_ORIGINS) o que la dirección sea otra.`,
            'sin_conexion',
          )
    }
    if (!response.ok) throw await failureOf(response, base)
    const parsed = RoomAnalysisSchema.safeParse(await response.json().catch(() => null))
    if (!parsed.success) {
      throw new LabError(
        'El servicio respondió, pero con un formato que no esperábamos. Conviene confirmar que la dirección sea la del backend de TP3 y que sea su versión más reciente.',
        'respuesta_invalida',
      )
    }
    return parsed.data
  } finally {
    clearTimeout(timer)
  }
}
