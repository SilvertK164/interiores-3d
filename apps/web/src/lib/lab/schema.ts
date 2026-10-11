import { z } from 'zod'

/** Los siete tipos de mueble que el servicio de TP3 sabe devolver (`FurnitureType` de su `main.py`). */
export const FURNITURE_TYPES = ['sofa', 'mesa', 'silla', 'estante', 'cama', 'planta', 'tv'] as const
export type FurnitureType = (typeof FURNITURE_TYPES)[number]

const LABELS: Record<FurnitureType, string> = {
  sofa: 'Sofá',
  mesa: 'Mesa',
  silla: 'Silla',
  estante: 'Estante',
  cama: 'Cama',
  planta: 'Planta',
  tv: 'Televisor',
}

export const isFurnitureType = (value: string): value is FurnitureType => (FURNITURE_TYPES as readonly string[]).includes(value)

/** Nombre en castellano para mostrar en pantalla; un tipo fuera de los siete se muestra tal cual, avisando que no lo es. */
export const furnitureLabel = (type: string): string => (isFurnitureType(type) ? LABELS[type] : `${type} (tipo desconocido)`)

const proportion = z.number().min(0).max(1)

/**
 * Un mueble detectado. `x` e `y` son el centro como proporción del ancho y del fondo del ambiente; `width` y `depth`, su tamaño
 * con la misma proporción; `rotation_deg` gira en sentido horario visto desde arriba. Los rangos son los que TP3 garantiza.
 * `type` es texto libre a propósito: un tipo nuevo o inesperado no debe invalidar toda la respuesta.
 */
export const DetectedFurnitureSchema = z.object({
  type: z.string(),
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
