import type { CatalogOption } from '@interiores/contract'
import { buildPrompt } from './prompt.js'
import { ProviderError, type VisionProvider } from './types.js'

export const DEFAULT_VISION_MODEL = 'gemini-3.5-flash'
/** Si el modelo principal está saturado (503, 429, 500 o plazo vencido) se prueba el siguiente, mientras quede tiempo. */
export const FALLBACK_VISION_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash'] as const
const RETRYABLE = /^(timeout|network|http_(429|500|502|503|504))/
/** Con menos tiempo que esto no se intenta otro modelo: la función de Vercel se corta a los 30 s. */
const MIN_REMAINING_MS = 6_000
/** La función de Vercel dura hasta 30 s (`apps/api/vercel.json`): este plazo deja margen para validar y responder. */
export const GEMINI_TIMEOUT_MS = 25_000
/**
 * Con los modelos que razonan, los tokens de razonamiento cuentan contra este tope: los 2000 de TP3 se agotaban antes de
 * terminar el JSON. 8192 es lo máximo que aceptan todos los modelos Flash.
 */
export const GEMINI_MAX_OUTPUT_TOKENS = 8192

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const FURNITURE_KEYS = ['asset_id', 'x', 'y', 'width', 'depth', 'rotation_deg', 'confidence'] as const

/** El esquema de la respuesta: cada mueble elige su `asset_id` entre las opciones recibidas (enumeradas) y todo es obligatorio. */
export function responseSchemaFor(catalog: readonly CatalogOption[]) {
  const number = { type: 'NUMBER' } as const
  return {
    type: 'OBJECT',
    properties: {
      furniture: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            asset_id: { type: 'STRING', enum: catalog.map((option) => option.id) },
            x: number,
            y: number,
            width: number,
            depth: number,
            rotation_deg: number,
            confidence: number,
          },
          required: [...FURNITURE_KEYS],
        },
      },
      warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['furniture', 'warnings'],
  } as const
}

export type GeminiOptions = {
  /** Va solo en la cabecera `x-goog-api-key`: nunca en la URL ni en un mensaje. */
  apiKey: string
  /** Por defecto `gemini-3.5-flash` (variable `VISION_MODEL`). */
  model?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

const isTimeout = (error: unknown) => error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')

/** El estado de Google (`RESOURCE_EXHAUSTED`…) si es una palabra de su vocabulario; su mensaje puede repetir lo que se le envió. */
async function httpReason(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: { status?: unknown } } | null
  const status = body?.error?.status
  return typeof status === 'string' && /^[A-Z_]{3,40}$/.test(status) ? `http_${res.status}:${status}` : `http_${res.status}`
}

/** Algunos modelos envuelven el JSON en una valla de código aunque se les pida JSON puro. */
const unfence = (text: string) => text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

type Part = { text?: unknown; thought?: unknown }
type Candidate = { content?: { parts?: Part[] }; finishReason?: unknown }
type Envelope = { candidates?: Candidate[]; promptFeedback?: { blockReason?: unknown } }

/** El texto que contestó el modelo (sin sus partes de razonamiento), o el motivo por el que no sirve. */
function textOf(envelope: Envelope): string {
  if (envelope.promptFeedback?.blockReason) throw new ProviderError('blocked')
  const candidate = envelope.candidates?.[0]
  if (!candidate) throw new ProviderError('empty')
  const finish = candidate.finishReason
  if (finish === 'MAX_TOKENS') throw new ProviderError('truncated')
  if (typeof finish === 'string' && finish !== 'STOP' && finish !== 'FINISH_REASON_UNSPECIFIED') {
    throw new ProviderError(`finish_${/^[A-Z_]{3,40}$/.test(finish) ? finish : 'OTHER'}`)
  }
  const parts: unknown = candidate.content?.parts
  const text = (Array.isArray(parts) ? (parts as (Part | null)[]) : [])
    .filter((part) => part?.thought !== true && typeof part?.text === 'string')
    .map((part) => part?.text as string)
    .join('')
  if (text.trim() === '') throw new ProviderError('empty')
  return text
}

/**
 * El proveedor de visión con Gemini, portado del backend de TP3: prompt con el catálogo delimitado, esquema de salida con el
 * `asset_id` enumerado y una sola llamada con plazo de 25 s. Devuelve el JSON que contestó el modelo, sin validarlo.
 */
function createModelProvider(options: GeminiOptions, model: string, timeoutMs: number): VisionProvider {
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const url = `${ENDPOINT}/${encodeURIComponent(model)}:generateContent`

  return async ({ image, mime, catalog }) => {
    const body = {
      contents: [{ parts: [{ text: buildPrompt(catalog) }, { inlineData: { mimeType: mime, data: image } }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchemaFor(catalog),
        temperature: 0.1,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      },
    }
    let res: Response
    try {
      res = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': options.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      // Nunca se repite el mensaje del error: puede traer la dirección, la clave o parte de lo enviado.
      throw new ProviderError(isTimeout(error) ? 'timeout' : 'network')
    }
    if (!res.ok) throw new ProviderError(await httpReason(res))

    let envelope: Envelope
    try {
      envelope = (await res.json()) as Envelope
    } catch (error) {
      throw new ProviderError(isTimeout(error) ? 'timeout' : 'bad_response')
    }
    const text = textOf(envelope ?? {})
    try {
      return JSON.parse(unfence(text)) as unknown
    } catch {
      throw new ProviderError('not_json')
    }
  }
}

/** El proveedor de visión: el modelo pedido y, si está saturado, los de respaldo (`FALLBACK_VISION_MODELS`). */
export function createGeminiProvider(options: GeminiOptions): VisionProvider {
  const first = options.model?.trim() || DEFAULT_VISION_MODEL
  const models = [first, ...FALLBACK_VISION_MODELS.filter((model) => model !== first)]
  const budget = options.timeoutMs ?? GEMINI_TIMEOUT_MS
  return async (request) => {
    const started = Date.now()
    let last: ProviderError = new ProviderError('unexpected')
    for (const model of models) {
      const remaining = budget - (Date.now() - started)
      if (remaining < MIN_REMAINING_MS && model !== first) break
      try {
        return await createModelProvider(options, model, model === first ? budget : remaining)(request)
      } catch (error) {
        if (!(error instanceof ProviderError) || !RETRYABLE.test(error.reason)) throw error
        last = error
      }
    }
    throw last
  }
}
