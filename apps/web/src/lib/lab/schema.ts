import { z } from 'zod'

const proportion = z.number().min(0).max(1)

/**
 * Un mueble detectado. `asset_id` es el id de UNA de las piezas del catálogo que se le enviaron a TP3 en `catalog_json`
 * (`analysis-catalog.ts`); `x` e `y` son el centro como proporción del ancho y del fondo del ambiente; `width` y `depth`, su
 * tamaño con la misma proporción (una estimación de Gemini: el tamaño real sale siempre del catálogo); `rotation_deg` gira en
 * sentido horario visto desde arriba. Los rangos son los que TP3 garantiza.
 * `asset_id` es texto libre a propósito: TP3 ya comprobó que esté en la lista, pero un id que este editor no conozca no debe
 * invalidar toda la respuesta; quien lo use lo resuelve contra el catálogo local y avisa si no está.
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

/** La respuesta de `POST /api/analyze-room` de TP3. */
export const RoomAnalysisSchema = z.object({
  furniture: z.array(DetectedFurnitureSchema),
  warnings: z.array(z.string()),
  calibration: z.object({
    status: z.enum(['uncalibrated', 'user_provided']),
    width_m: z.number().nullable(),
  }),
})

export type DetectedFurniture = z.infer<typeof DetectedFurnitureSchema>
export type RoomAnalysis = z.infer<typeof RoomAnalysisSchema>
