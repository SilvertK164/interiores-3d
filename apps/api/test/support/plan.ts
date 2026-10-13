/**
 * Un plano válido del contrato v2 (lo que debe contestar el proveedor de visión) para las pruebas: un salón de 3,2 × 7 m visto desde
 * el extremo sur, con una ventana en el muro este y las dos piezas de `CATALOG` (`images.ts`). Los muebles van uno detrás del otro.
 */
export const piece = (extra: Record<string, unknown> = {}) => ({
  asset_id: 'sofa',
  x_m: 1.6,
  z_m: 5,
  facing_deg: 180,
  against_wall: null,
  on_top_of: null,
  confidence: 0.8,
  ...extra,
})

export const PLAN = {
  room: { width_m: 3.2, depth_m: 7 },
  camera: { x_m: 1.6, z_m: 6.8, look_at: { x_m: 1.6, z_m: 0 } },
  openings: [{ type: 'window', wall: 'e', at_m: 2, width_m: 1.4 }],
  furniture: [piece(), piece({ asset_id: 'coffee-table', z_m: 3.4, confidence: 0.88 })],
  warnings: ['oclusión parcial'],
}

/** El mismo ambiente, sin aberturas, muebles ni avisos: una foto sin nada del catálogo. */
export const EMPTY_PLAN = { ...PLAN, openings: [], furniture: [], warnings: [] }
