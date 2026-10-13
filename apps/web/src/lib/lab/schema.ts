/**
 * La respuesta del análisis de fotos (`POST /v1/analyze-room`) se define una sola vez, en `packages/contract`: el plano del ambiente
 * visto desde arriba, en metros (`RoomAnalysis`: el ambiente `room`, desde dónde se tomó la foto `camera`, las puertas y ventanas
 * `openings`, los muebles `furniture` y los avisos). Cada mueble (`DetectedFurniture`) trae el `asset_id` de UNA de las piezas del
 * catálogo enviado, su centro `x_m`/`z_m` (origen en la esquina noroeste, x al este, z al sur), `facing_deg` (0 = el frente mira al sur,
 * giro horario visto desde arriba), `against_wall`, `on_top_of` (índice de otro mueble) y `confidence`. Aquí solo se reexporta para
 * «Escena desde una foto» y «Muebles desde una foto».
 *
 * `asset_id` es texto libre a propósito: la API ya comprobó que esté en la lista enviada, pero un id que este editor no conozca no
 * debe invalidar toda la respuesta; quien lo use lo resuelve contra el catálogo local y avisa si no está.
 */
export {
  CAMERA_FOV_DEFAULT_DEG,
  CAMERA_MAX_OUTSIDE_M,
  DetectedFurnitureSchema,
  PhotoCameraSchema,
  ROOM_MAX_M,
  ROOM_MIN_M,
  RoomAnalysisSchema,
  RoomOpeningSchema,
  RoomSizeSchema,
  WALL_SIDES,
  type DetectedFurniture,
  type PhotoCamera,
  type RoomAnalysis,
  type RoomOpening,
  type RoomSize,
  type WallSide,
} from '@interiores/contract'
