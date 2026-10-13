import type { AnalyzeMime, CatalogOption } from '@interiores/contract'

/** Lo que se le pide al modelo de visión: la foto en base64, su formato y las piezas entre las que puede elegir. */
export type VisionRequest = { image: string; mime: AnalyzeMime; catalog: CatalogOption[] }

/** Llama al modelo de visión y devuelve el JSON que contestó, sin validarlo (eso lo hace `analyzeRoom`). Lanza `ProviderError`. */
export type VisionProvider = (request: VisionRequest) => Promise<unknown>

/**
 * Falla del proveedor. Lleva solo un `reason` corto de un vocabulario cerrado (`timeout`, `network`, `http_429:RESOURCE_EXHAUSTED`,
 * `empty`, `blocked`…): es lo único que se registra, y nunca el texto de la respuesta, el prompt, la foto ni la clave.
 */
export class ProviderError extends Error {
  constructor(readonly reason: string) {
    super(`proveedor de visión: ${reason}`)
    this.name = 'ProviderError'
  }
}

/** Lo que `buildApp` necesita para atender `POST /v1/analyze-room`. */
export type AnalysisDeps = {
  /** `null` cuando no hay clave configurada: el análisis responde 503 sin llamar a nadie. */
  provider: VisionProvider | null
}
