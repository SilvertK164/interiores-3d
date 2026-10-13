import type { SolverAsset } from '../../src/lib/lab/layout-solver'
import type { DetectedFurniture, RoomAnalysis, RoomOpening } from '../../src/lib/lab/schema'
import { availableAssets } from './asset-ids'

/**
 * Lo que comparten las pruebas del acomodador (`layout-solver*.test.ts`): las piezas reales del catálogo local con sus medidas de
 * verdad (las mismas que ve el editor) y constructores de un plano chico para escribir cada caso en una línea.
 */
export const ASSETS = new Map<string, SolverAsset & { name: string; dimensions: [number, number, number] }>(
  availableAssets().map(({ id, name, dimensions }) => [id, { id, name, dimensions }] as const),
)
export const resolve = (id: string) => ASSETS.get(id)
/** Las medidas reales `[ancho, alto, fondo]` de una pieza del catálogo. */
export const dims = (id: string): [number, number, number] => (ASSETS.get(id) as { dimensions: [number, number, number] }).dimensions

export const piece = (over: Partial<DetectedFurniture> = {}): DetectedFurniture => ({
  asset_id: 'sofa',
  x_m: 2,
  z_m: 2,
  facing_deg: 0,
  against_wall: null,
  on_top_of: null,
  confidence: 0.9,
  ...over,
})

export const opening = (over: Partial<RoomOpening> = {}): RoomOpening => ({ type: 'door', wall: 's', at_m: 1, width_m: 0.9, ...over })

/** Un plano con la cámara al sur mirando al norte; todo lo que no se diga queda en su valor por defecto (4 × 3 m, sin aberturas ni avisos). */
export function planOf(furniture: DetectedFurniture[] = [], over: Partial<RoomAnalysis> = {}): RoomAnalysis {
  const room = over.room ?? { width_m: 4, depth_m: 3 }
  return {
    room,
    camera: { x_m: room.width_m / 2, z_m: room.depth_m - 0.2, look_at: { x_m: room.width_m / 2, z_m: 0 } },
    openings: [],
    furniture,
    warnings: [],
    ...over,
  }
}

/** Una huella `[x0, x1, z0, z1]` axial (la que ocupa una pieza girada un múltiplo de 90°). */
export function boxOf(asset: string, x: number, z: number, facingDeg: number): [number, number, number, number] {
  const [w, , d] = dims(asset)
  const turned = Math.round(facingDeg / 90) % 2 !== 0
  const [hx, hz] = turned ? [d / 2, w / 2] : [w / 2, d / 2]
  return [x - hx, x + hx, z - hz, z + hz]
}

/** ¿Se pisan dos huellas axiales por más de `tolerance` metros en los dos ejes? */
export function overlaps(a: [number, number, number, number], b: [number, number, number, number], tolerance = 0.03): boolean {
  return Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > tolerance && Math.min(a[3], b[3]) - Math.max(a[2], b[2]) > tolerance
}
