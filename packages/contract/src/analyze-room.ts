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
 * El catálogo viaja al modelo entre las etiquetas `[[CATALOG_START]]` y `[[CATALOG_END]]` (ver el prompt de la API): un texto
 * con dobles corchetes podría cerrar la etiqueta y colar instrucciones, así que no se admiten.
 */
const withoutBrackets = (text: string) => !text.includes('[[') && !text.includes(']]')
const catalogText = (max: number) => z.string().trim().min(1).max(max).refine(withoutBrackets, 'No puede llevar dobles corchetes.')

/** Medida real de una pieza del catálogo, en metros: más de 0 y hasta 20. */
const pieceSide = z.number().gt(0).max(20)

/**
 * Lo que se le cuenta al servicio de cada pieza que puede elegir: nada más que esto. Sin rutas ni `src`: el modelo solo escoge un
 * identificador. Las medidas reales (`dimensions_m = [ancho, alto, fondo]`, en metros, las del catálogo local de quien llama) son
 * opcionales y sirven de regla para estimar el tamaño del ambiente y para que ningún mueble se superponga con otro.
 */
export const CatalogOptionSchema = z.strictObject({
  id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/),
  name: catalogText(120),
  category: catalogText(60),
  tags: z.array(catalogText(40)).max(10).default([]),
  dimensions_m: z.tuple([pieceSide, pieceSide, pieceSide]).optional(),
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
  /** Ancho conocido del muro del fondo de la foto (de lado a lado) en metros, mayor que 0 y hasta 100: ayuda al modelo a calibrar las medidas. */
  knownWidthM: z.number().gt(0).max(100).optional(),
  catalog: AnalysisCatalogSchema,
})

// --- La respuesta: el plano del ambiente visto desde arriba ------------------------------------------------------------------------
// Sistema de coordenadas del ambiente, en metros: origen en la esquina noroeste, `x` hacia el este (derecha del plano) y `z` hacia el
// sur (abajo). El ambiente es el rectángulo `[0, width_m] × [0, depth_m]`.

/** Los cuatro muros: norte (arriba del plano), sur (abajo), este (derecha) y oeste (izquierda). */
export const WALL_SIDES = ['n', 's', 'e', 'w'] as const
export const WallSideSchema = z.enum(WALL_SIDES)

/** Cada lado del ambiente mide de 1,5 a 12 m. */
export const ROOM_MIN_M = 1.5
export const ROOM_MAX_M = 12
/** La cámara puede estar hasta 1 m fuera del rectángulo (una foto tomada desde la puerta). */
export const CAMERA_MAX_OUTSIDE_M = 1
/** Campo de visión vertical de la foto, en grados; si el modelo no lo da, vale `CAMERA_FOV_DEFAULT_DEG`. */
export const CAMERA_FOV_MIN_DEG = 30
export const CAMERA_FOV_MAX_DEG = 100
export const CAMERA_FOV_DEFAULT_DEG = 60
/** El punto al que mira la foto no puede ser (casi) el mismo donde está la cámara. */
export const CAMERA_MIN_LOOK_M = 0.05
/** Tope de lo que puede traer un plano (más que esto es un modelo desbocado, no una sala). */
export const ANALYZE_MAX_FURNITURE = 100
export const ANALYZE_MAX_OPENINGS = 30

/** Una coordenada del plano: un metro de holgura a cada lado, para la cámara y para lo que el modelo deja apenas afuera. */
const coordinate = z
  .number()
  .min(-CAMERA_MAX_OUTSIDE_M)
  .max(ROOM_MAX_M + CAMERA_MAX_OUTSIDE_M)

/** El ambiente: un rectángulo de `width_m` (de oeste a este) por `depth_m` (de norte a sur), entre las caras interiores de los muros. */
export const RoomSizeSchema = z.object({
  width_m: z.number().min(ROOM_MIN_M).max(ROOM_MAX_M),
  depth_m: z.number().min(ROOM_MIN_M).max(ROOM_MAX_M),
})

/**
 * Desde dónde se tomó la foto: su posición en el plano (dentro del ambiente, en una esquina o hasta 1 m fuera de un muro) y el punto
 * del plano al que mira el centro de la foto. La altura de los ojos es siempre 1,5 m. `fov_deg` es el campo de visión vertical.
 */
export const PhotoCameraSchema = z.object({
  x_m: coordinate,
  z_m: coordinate,
  look_at: z.object({ x_m: coordinate, z_m: coordinate }),
  fov_deg: z.number().min(CAMERA_FOV_MIN_DEG).max(CAMERA_FOV_MAX_DEG).optional(),
})

/**
 * Una puerta o una ventana. `at_m` es la distancia al CENTRO de la abertura medida a lo largo del muro desde su esquina izquierda
 * mirando el muro desde dentro del ambiente (muro norte: desde el oeste; sur: desde el este; este: desde el norte; oeste: desde el sur).
 */
export const RoomOpeningSchema = z.object({
  type: z.enum(['door', 'window']),
  wall: WallSideSchema,
  at_m: z.number().min(0).max(ROOM_MAX_M),
  width_m: z.number().min(0.3).max(6),
})

/**
 * Un mueble del plano. `asset_id` es el id de UNA de las piezas del catálogo que se enviaron; `x_m` y `z_m`, el centro de su huella en
 * metros; `facing_deg`, hacia dónde mira su frente (0 = al sur, giro horario visto desde arriba: 90 = al oeste, 180 = al norte,
 * 270 = al este); `against_wall`, el muro contra el que está pegado (o `null`); `on_top_of`, el índice (desde 0) de otro mueble de la
 * lista sobre el que está apoyado (una tele sobre su mueble, una planta sobre una mesa) o `null` si está en el piso. El tamaño real
 * sale siempre del catálogo, no del modelo.
 */
export const DetectedFurnitureSchema = z.object({
  asset_id: z.string().min(1).max(100),
  x_m: coordinate,
  z_m: coordinate,
  facing_deg: z.number().min(-360).max(360),
  against_wall: WallSideSchema.nullable(),
  on_top_of: z
    .number()
    .int()
    .min(0)
    .max(ANALYZE_MAX_FURNITURE - 1)
    .nullable(),
  confidence: z.number().min(0).max(1),
})

type Plan = {
  room: z.infer<typeof RoomSizeSchema>
  camera: z.infer<typeof PhotoCameraSchema>
  furniture: z.infer<typeof DetectedFurnitureSchema>[]
}

const EPSILON = 1e-9

/** Las reglas entre campos: la cámara cerca del rectángulo y mirando a otro punto, y `on_top_of` apuntando a un mueble real, sin ciclos. */
function checkPlan({ room, camera, furniture }: Plan, ctx: z.RefinementCtx) {
  const near = (value: number, size: number) => value >= -CAMERA_MAX_OUTSIDE_M - EPSILON && value <= size + CAMERA_MAX_OUTSIDE_M + EPSILON
  if (!(near(camera.x_m, room.width_m) && near(camera.z_m, room.depth_m))) {
    ctx.addIssue({ code: 'custom', path: ['camera'], message: 'La cámara puede estar a lo sumo 1 m fuera del rectángulo del ambiente.' })
  }
  if (Math.hypot(camera.look_at.x_m - camera.x_m, camera.look_at.z_m - camera.z_m) < CAMERA_MIN_LOOK_M) {
    ctx.addIssue({ code: 'custom', path: ['camera', 'look_at'], message: 'El punto al que mira la cámara debe ser distinto de donde está.' })
  }

  const supportOf = (index: number): number | null => furniture[index]?.on_top_of ?? null
  const real = new Set<number>()
  furniture.forEach((piece, index) => {
    const support = piece.on_top_of
    if (support === null) return
    const fail = (message: string) => ctx.addIssue({ code: 'custom', path: ['furniture', index, 'on_top_of'], message })
    if (support === index) fail('Un mueble no puede estar apoyado sobre sí mismo.')
    else if (support >= furniture.length) fail('on_top_of apunta a un mueble que no está en la lista.')
    else real.add(index)
  })
  for (const start of real) {
    let current = supportOf(start)
    for (let step = 0; current !== null && real.has(current) && step <= furniture.length; step++) {
      if (current === start) {
        ctx.addIssue({ code: 'custom', path: ['furniture', start, 'on_top_of'], message: 'Los muebles apoyados unos sobre otros no pueden formar un ciclo.' })
        break
      }
      current = supportOf(current)
    }
  }
}

/** La respuesta de `POST /v1/analyze-room`: el plano visto desde arriba, en el orden en que el modelo lo razona (ambiente, cámara, aberturas, muebles). */
export const RoomAnalysisSchema = z
  .object({
    room: RoomSizeSchema,
    camera: PhotoCameraSchema,
    openings: z.array(RoomOpeningSchema).max(ANALYZE_MAX_OPENINGS),
    furniture: z.array(DetectedFurnitureSchema).max(ANALYZE_MAX_FURNITURE),
    warnings: z.array(z.string()),
  })
  .superRefine(checkPlan)

export type AnalyzeMime = z.infer<typeof AnalyzeMimeSchema>
export type CatalogOption = z.infer<typeof CatalogOptionSchema>
export type AnalyzeRoomBody = z.infer<typeof AnalyzeRoomBodySchema>
export type WallSide = z.infer<typeof WallSideSchema>
export type RoomSize = z.infer<typeof RoomSizeSchema>
export type PhotoCamera = z.infer<typeof PhotoCameraSchema>
export type RoomOpening = z.infer<typeof RoomOpeningSchema>
export type DetectedFurniture = z.infer<typeof DetectedFurnitureSchema>
export type RoomAnalysis = z.infer<typeof RoomAnalysisSchema>
