/**
 * La respuesta del análisis de fotos (`POST /v1/analyze-room`) se define una sola vez, en `packages/contract`: un mueble detectado
 * (`DetectedFurniture`: `asset_id` de UNA de las piezas del catálogo enviado, `x` e `y` como proporción del ancho y del fondo del
 * ambiente, `width` y `depth` estimados, `rotation_deg` horario visto desde arriba y `confidence`) y el análisis completo
 * (`RoomAnalysis`: muebles, avisos y calibración). Aquí solo se reexporta para el laboratorio y «Muebles desde una foto».
 *
 * `asset_id` es texto libre a propósito: la API ya comprobó que esté en la lista enviada, pero un id que este editor no conozca no
 * debe invalidar toda la respuesta; quien lo use lo resuelve contra el catálogo local y avisa si no está.
 */
export { DetectedFurnitureSchema, RoomAnalysisSchema, type DetectedFurniture, type RoomAnalysis } from '@interiores/contract'
