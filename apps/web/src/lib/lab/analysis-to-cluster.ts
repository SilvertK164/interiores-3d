import { round3 } from './layout-geometry'
import { solveLayout } from './layout-solver'
import type { SolverAsset } from './layout-types'
import type { RoomAnalysis } from './schema'

/** Lo único que se le pide a una pieza local: su id, su nombre (para escribir los avisos) y su tamaño real `[ancho, alto, fondo]`. */
export type ClusterAssetLike = SolverAsset

/**
 * Una pieza del conjunto: el mueble del catálogo local (con su tamaño real), su centro `at = [x, z]` en metros relativo al centro del
 * ambiente de la foto (+x al este y +z al sur, igual que el plano de Pascal), su `rotY` de Pascal y `y`, la altura de su base sobre el
 * piso (0 en el piso; la de su soporte si está apoyada: una tele sobre su mueble). `source` es su posición en `analysis.furniture` (con
 * ella se liga la pieza con su fila en el diálogo) y `supportedBy`, la posición (en este conjunto) de la pieza que la sostiene, o `null`.
 */
export type ClusterPiece<T extends ClusterAssetLike = ClusterAssetLike> = {
  asset: T
  source: number
  at: [number, number]
  rotY: number
  y: number
  supportedBy: number | null
}

export type AnalysisToClusterOptions = {
  /** Para contarle a la persona lo que se corrigió o se dejó afuera (confianza baja, una pieza que el catálogo local no tiene, lo que se movió). */
  warn?: (message: string) => void
}

/**
 * Convierte el plano de la foto en un conjunto de muebles del catálogo local: lo acomoda con `solveLayout` (nada fuera del ambiente ni
 * solapado, lo que va contra un muro mira hacia adentro, los asientos miran a su foco, lo apoyado sube a la altura real de su soporte) y
 * lleva cada posición en metros a coordenadas relativas al centro del ambiente de la foto, sin inventar ninguna medida: el ambiente es el
 * que estimó Gemini. El tamaño de cada pieza es SIEMPRE el real del catálogo. Se descartan, con aviso (`warn`), las piezas de confianza
 * menor que 0,3 y las que `resolve` no conoce (y lo apoyado sobre ellas); nunca se las reemplaza por otra pieza. Las repetidas (cuatro
 * sillas) son piezas distintas. Mantiene el orden del plano.
 */
export function analysisToCluster<T extends ClusterAssetLike>(
  analysis: RoomAnalysis,
  resolve: (assetId: string) => T | undefined,
  opts: AnalysisToClusterOptions = {},
): ClusterPiece<T>[] {
  const plan = solveLayout(analysis, resolve)
  for (const message of plan.warnings) opts.warn?.(message)
  const centerX = plan.room.width / 2
  const centerZ = plan.room.depth / 2
  return plan.pieces.map((piece) => ({
    asset: piece.asset,
    source: piece.source,
    at: [round3(piece.x - centerX), round3(piece.z - centerZ)],
    rotY: piece.rotY,
    y: piece.y,
    supportedBy: piece.supportedBy,
  }))
}
