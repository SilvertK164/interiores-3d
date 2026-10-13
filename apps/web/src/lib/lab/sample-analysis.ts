import type { RoomAnalysis } from './schema'

/**
 * Un plano fijo con el mismo formato que devuelve la API (`POST /v1/analyze-room`): un living de 5 × 4,4 m visto desde el muro sur, con la tele
 * sobre su mueble contra el muro norte, el sofá contra el muro sur mirando hacia ella, la mesa de centro sobre una alfombra, un sillón, una
 * biblioteca, una lámpara de pie, una puerta y una ventana. Las piezas son candidatas de `analysis-catalog.ts`; la planta tiene confianza baja
 * (se descarta con aviso) y el análisis trae un aviso. Sirve para probar el modelado y «Muebles desde una foto» sin servicio, sin clave de Gemini
 * y sin cuota, y es el mismo que usan las pruebas.
 */
export const SAMPLE_ANALYSIS: RoomAnalysis = {
  room: { width_m: 5, depth_m: 4.4 },
  camera: { x_m: 2.5, z_m: 4.3, look_at: { x_m: 2.5, z_m: 0 } },
  openings: [
    { type: 'window', wall: 'e', at_m: 2, width_m: 1.6 },
    { type: 'door', wall: 's', at_m: 0.9, width_m: 0.9 },
  ],
  furniture: [
    { asset_id: 'tv-stand', x_m: 2.5, z_m: 0.31, facing_deg: 0, against_wall: 'n', on_top_of: null, confidence: 0.9 },
    { asset_id: 'television', x_m: 2.5, z_m: 0.31, facing_deg: 0, against_wall: null, on_top_of: 0, confidence: 0.95 },
    { asset_id: 'rectangular-carpet', x_m: 2.5, z_m: 2.3, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.8 },
    { asset_id: 'coffee-table', x_m: 2.5, z_m: 2.3, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.88 },
    { asset_id: 'sofa', x_m: 2.5, z_m: 3.745, facing_deg: 180, against_wall: 's', on_top_of: null, confidence: 0.92 },
    { asset_id: 'livingroom-chair', x_m: 4.15, z_m: 2.3, facing_deg: 90, against_wall: null, on_top_of: null, confidence: 0.76 },
    { asset_id: 'bookshelf', x_m: 0.315, z_m: 1.8, facing_deg: 270, against_wall: 'w', on_top_of: null, confidence: 0.81 },
    { asset_id: 'floor-lamp', x_m: 4.4, z_m: 0.6, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.7 },
    { asset_id: 'indoor-plant', x_m: 4.5, z_m: 3, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.2 },
  ],
  warnings: ['La planta está parcialmente tapada por el sillón: su posición es aproximada.'],
}
