import { nameEs } from '../catalog-es'
import type { PhotoCamera, WallSide } from './schema'

/** Lo único que se le pide a una pieza local: su id, su nombre (para los avisos) y, si se conoce, el tamaño real `[ancho, alto, fondo]` de su catálogo. */
export type SolverAsset = { id: string; name?: string; dimensions?: readonly number[] }

/**
 * Una pieza ya acomodada, en metros desde la esquina noroeste del ambiente (x al este, z al sur). `x`/`z` son el centro de su huella;
 * `y`, la altura de su base sobre el piso (0 en el piso; la de su soporte si está apoyada). `facingDeg` (0 = el frente mira al sur, giro
 * horario) y `rotY` (el giro de Pascal: el signo opuesto) dicen lo mismo. `width`, `height` y `depth` son siempre las del catálogo.
 */
export type PlacedPiece<T extends SolverAsset = SolverAsset> = {
  asset: T
  /** Su posición en `analysis.furniture`: con ella se liga cada pieza con su fila de la tabla. */
  source: number
  x: number
  z: number
  y: number
  facingDeg: number
  rotY: number
  width: number
  height: number
  depth: number
  confidence: number
  againstWall: WallSide | null
  /** La posición (en `pieces`) del mueble sobre el que está apoyada, o `null` si está en el piso. */
  supportedBy: number | null
}

/** Una puerta o ventana ya acomodada: `at` es la distancia al centro desde la esquina izquierda mirando el muro desde dentro del ambiente. */
export type PlacedOpening = { type: 'door' | 'window'; wall: WallSide; at: number; width: number }

/** El ambiente: un rectángulo de `width` (oeste a este, en x) por `depth` (norte a sur, en z), en metros. */
export type Room = { width: number; depth: number }

/** El plano corregido: el ambiente (ya recortado), la cámara tal cual, las aberturas, las piezas y un aviso en castellano por cada corrección importante. */
export type LayoutPlan<T extends SolverAsset = SolverAsset> = {
  room: Room
  camera: PhotoCamera
  openings: PlacedOpening[]
  pieces: PlacedPiece<T>[]
  warnings: string[]
}

/** Una pieza mientras se acomoda (interno del acomodador). */
export type Entry<T extends SolverAsset = SolverAsset> = {
  source: number
  asset: T
  label: string
  width: number
  height: number
  depth: number
  confidence: number
  /** El centro que dio Gemini y el actual. */
  gx: number
  gz: number
  x: number
  z: number
  y: number
  facing: number
  wall: WallSide | null
  /** La mitad de su huella en x y en z con el giro actual. */
  hx: number
  hz: number
  /** `source` de su soporte, o `null`. */
  supportSource: number | null
  /** Las alfombras se pisan con todo y quedan en el piso. */
  rug: boolean
  /** Cuánto se movió por cada motivo (para avisar solo lo grande). */
  movedBy: { wall: number; inside: number; overlap: number; opening: number }
}

/** Nombre en castellano de una pieza local para los avisos; si el catálogo no lo tiene, el nombre que traiga o su id. */
export const labelOf = (asset: SolverAsset): string => nameEs(asset.id, asset.name ?? asset.id)

const METERS = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })
/** Metros con coma decimal: 0,4 m. */
export const meters = (n: number): string => `${METERS.format(n)} m`
