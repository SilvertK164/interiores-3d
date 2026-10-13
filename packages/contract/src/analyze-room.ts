import { z } from 'zod'

/** Tope de la foto ya decodificada (3 MiB). La web la reduce antes de enviarla (≤ 1600 px, JPEG), así que casi nunca pasa de 1 MB. */
export const ANALYZE_IMAGE_MAX_BYTES = 3 * 1024 * 1024
/** La misma foto en base64: 4 caracteres por cada 3 bytes. */
export const ANALYZE_IMAGE_MAX_BASE64_CHARS = (ANALYZE_IMAGE_MAX_BYTES / 3) * 4
/** Opciones que puede llevar el catálogo y peso máximo de su JSON en UTF-8. */
export const ANALYZE_CATALOG_MAX_ITEMS = 100
export const ANALYZE_CATALOG_MAX_BYTES = 64 * 1024
/**
 * Tope del cuerpo de `POST /v1/analyze-room`: la foto en base64, el catálogo y holgura para las claves del JSON.
 * Queda por debajo de los 4,5 MB que Vercel admite por petición a una función (ver docs/nube.md).
 */
export const ANALYZE_BODY_MAX_BYTES = ANALYZE_IMAGE_MAX_BASE64_CHARS + ANALYZE_CATALOG_MAX_BYTES + 4 * 1024
/** Análisis que cada persona puede pedir por hora; la migración 004 repite este número en su disparador. */
export const ANALYSES_PER_HOUR = 10

export const ANALYZE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const AnalyzeMimeSchema = z.enum(ANALYZE_MIME_TYPES)

/**
 * Lo que se le cuenta al servicio de cada pieza que puede elegir: nada más que esto. Sin rutas, sin `src` y sin medidas,
 * porque el modelo solo escoge un identificador y el tamaño real sale siempre del catálogo local de quien llama.
 */
export const CatalogOptionSchema = z.strictObject({
  id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
})

const utf8Bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length

/** De 1 a 100 opciones, con ids únicos y hasta 64 KB de JSON. */
export const AnalysisCatalogSchema = z
  .array(CatalogOptionSchema)
  .min(1)
  .max(ANALYZE_CATALOG_MAX_ITEMS)
  .superRefine((catalog, ctx) => {
    const ids = catalog.map((option) => option.id)
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Cada opción del catálogo debe tener un id único.' })
    if (utf8Bytes(catalog) > ANALYZE_CATALOG_MAX_BYTES) ctx.addIssue({ code: 'custom', message: 'El catálogo supera los 64 KB.' })
  })

export const AnalyzeRoomBodySchema = z.object({
  /** La foto en base64 (sin el prefijo `data:`), de hasta 3 MiB una vez decodificada. */
  image: z.string().min(1).max(ANALYZE_IMAGE_MAX_BASE64_CHARS),
  /** El formato real de la foto: la API comprueba que coincida con los primeros bytes del archivo. */
  mime: AnalyzeMimeSchema,
  /** Ancho conocido del ambiente en metros, mayor que 0 y hasta 100. */
  knownWidthM: z.number().gt(0).max(100).optional(),
  catalog: AnalysisCatalogSchema,
})

const proportion = z.number().min(0).max(1)

/**
 * Un mueble detectado. `asset_id` es el id de UNA de las piezas del catálogo que se enviaron; `x` e `y` son el centro como
 * proporción del ancho y del fondo del ambiente; `width` y `depth`, su tamaño con la misma proporción (una estimación del
 * modelo: el tamaño real sale siempre del catálogo); `rotation_deg` gira en sentido horario visto desde arriba.
 */
export const DetectedFurnitureSchema = z.object({
  asset_id: z.string().min(1).max(100),
  x: proportion,
  y: proportion,
  width: z.number().gt(0).max(1),
  depth: z.number().gt(0).max(1),
  rotation_deg: z.number().min(-360).max(360),
  confidence: proportion,
})

export const CalibrationSchema = z.object({
  status: z.enum(['uncalibrated', 'user_provided']),
  width_m: z.number().nullable(),
})

/** La respuesta de `POST /v1/analyze-room`. */
export const RoomAnalysisSchema = z.object({
  furniture: z.array(DetectedFurnitureSchema),
  warnings: z.array(z.string()),
  calibration: CalibrationSchema,
})

export type AnalyzeMime = z.infer<typeof AnalyzeMimeSchema>
export type CatalogOption = z.infer<typeof CatalogOptionSchema>
export type AnalyzeRoomBody = z.infer<typeof AnalyzeRoomBodySchema>
export type DetectedFurniture = z.infer<typeof DetectedFurnitureSchema>
export type Calibration = z.infer<typeof CalibrationSchema>
export type RoomAnalysis = z.infer<typeof RoomAnalysisSchema>
