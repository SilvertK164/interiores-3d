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

/**
 * La foto que acompaña a `EXAMPLE_ANALYSIS` (`public/examples/salon.jpg`, reducida a 1600 px; origen en `THIRD_PARTY_NOTICES.md`): los botones
 * «Probar con un ejemplo» la muestran en lugar de la foto que la persona subiría. `label` es la etiqueta discreta que la acompaña.
 */
export const EXAMPLE_PHOTO = {
  src: '/examples/salon.jpg',
  alt: 'Foto de ejemplo: un salón largo y angosto con la tele sobre un mueble blanco, un sofá gris en L junto a la ventana, una alfombra con mesa de centro de mármol, dos sillones rojos y un comedor al fondo.',
  label: 'Foto de ejemplo',
} as const

/**
 * El plano de esa foto (los botones «Probar con un ejemplo» de «Escena desde una foto» y «Muebles desde una foto»), con el mismo formato que
 * la API: un salón largo y angosto de 3,6 × 7,5 m visto desde el muro sur (cámara en x 1,8 z 7,4 mirando al norte). La tele sobre su mueble va
 * contra el muro norte con una planta a cada lado; al medio, la alfombra con la mesa de centro de mármol; el sofá, contra el muro este (bajo la
 * ventana) mirando al oeste; dos sillones rojos miran al norte, y el comedor con cuatro sillas queda al fondo del salón. Ya está acomodado: el
 * acomodador no mueve nada. `SAMPLE_ANALYSIS` sigue siendo el de las pruebas.
 */
export const EXAMPLE_ANALYSIS: RoomAnalysis = {
  room: { width_m: 3.6, depth_m: 7.5 },
  camera: { x_m: 1.8, z_m: 7.4, look_at: { x_m: 1.8, z_m: 0 } },
  openings: [
    { type: 'window', wall: 'e', at_m: 3, width_m: 2.4 },
    { type: 'door', wall: 'w', at_m: 5.6, width_m: 0.9 },
  ],
  furniture: [
    { asset_id: 'tv-stand', x_m: 1.8, z_m: 0.31, facing_deg: 0, against_wall: 'n', on_top_of: null, confidence: 0.93 },
    { asset_id: 'television', x_m: 1.8, z_m: 0.31, facing_deg: 0, against_wall: null, on_top_of: 0, confidence: 0.96 },
    { asset_id: 'indoor-plant', x_m: 0.5, z_m: 0.565, facing_deg: 0, against_wall: 'n', on_top_of: null, confidence: 0.82 },
    { asset_id: 'indoor-plant', x_m: 3.1, z_m: 0.565, facing_deg: 0, against_wall: 'n', on_top_of: null, confidence: 0.78 },
    { asset_id: 'rectangular-carpet', x_m: 1.75, z_m: 2.6, facing_deg: 90, against_wall: null, on_top_of: null, confidence: 0.85 },
    { asset_id: 'coffee-table', x_m: 1.65, z_m: 2.6, facing_deg: 90, against_wall: null, on_top_of: null, confidence: 0.9 },
    { asset_id: 'sofa', x_m: 2.945, z_m: 2.6, facing_deg: 90, against_wall: 'e', on_top_of: null, confidence: 0.94 },
    { asset_id: 'lounge-chair', x_m: 0.8, z_m: 4.15, facing_deg: 180, against_wall: null, on_top_of: null, confidence: 0.88 },
    { asset_id: 'lounge-chair', x_m: 1.85, z_m: 4.15, facing_deg: 180, against_wall: null, on_top_of: null, confidence: 0.86 },
    { asset_id: 'dining-table', x_m: 1.8, z_m: 6, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.74 },
    { asset_id: 'dining-chair', x_m: 1.25, z_m: 5.255, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.72 },
    { asset_id: 'dining-chair', x_m: 2.35, z_m: 5.255, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.72 },
    { asset_id: 'dining-chair', x_m: 1.25, z_m: 6.745, facing_deg: 180, against_wall: null, on_top_of: null, confidence: 0.71 },
    { asset_id: 'dining-chair', x_m: 2.35, z_m: 6.745, facing_deg: 180, against_wall: null, on_top_of: null, confidence: 0.71 },
  ],
  warnings: ['El comedor del fondo se ve lejos y tapado por los sillones: la posición de su mesa y sus sillas es aproximada.'],
}
