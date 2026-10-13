import { nameEs } from '../catalog-es'
import type { RoomAnalysis } from './schema'

/** Ancho del ambiente de la foto cuando la persona no lo sabe, en metros. */
export const DEFAULT_ROOM_WIDTH_M = 4
/** Fondo del ambiente de la foto como proporción de su ancho (los ambientes de una foto suelen ser más anchos que hondos). */
export const ROOM_DEPTH_RATIO = 0.75
/** Por debajo de esta confianza el análisis no está seguro de que la pieza esté en la foto: se descarta (con aviso). */
export const MIN_CONFIDENCE = 0.3

/** Lo único que se le pide a una pieza local: su id y su nombre (para escribir los avisos). */
export type ClusterAssetLike = { id: string; name?: string }

/**
 * Una pieza del conjunto: el mueble del catálogo local (con su tamaño real), su centro `at = [x, z]` en metros relativo al
 * centro del ambiente de la foto (+x a la derecha, +z hacia abajo, igual que el plano de Pascal) y su `rotY` de Pascal.
 */
export type ClusterPiece<T extends ClusterAssetLike = ClusterAssetLike> = { asset: T; at: [number, number]; rotY: number }

export type AnalysisToClusterOptions = {
  /** Ancho del ambiente en metros si la persona lo escribió; vacío, `null` o inválido = 4 m. */
  knownWidthM?: number | null
  /** Para contarle a la persona lo que se dejó afuera (confianza baja o una pieza que el catálogo local no tiene). */
  warn?: (message: string) => void
}

/** Al milímetro, y nunca `-0`: un `-0` suelto no es igual a `0` para `toEqual` ni para quien compare con `Object.is`. */
const round3 = (n: number) => Math.round(n * 1000) / 1000 + 0

/**
 * El giro del análisis es horario visto desde arriba; el `rotY` de Pascal (el de three.js) es antihorario, así que lleva el signo
 * opuesto. Pascal dibuja el giro de una guía en el plano con `-rotationY` (`getGuideSvgRotation`, `floorplan-panel.tsx`): ahí el
 * giro horario es el positivo. Con `rotY = 0` el frente de la pieza mira a +z (hacia abajo en el plano, hacia quien mira la foto).
 * Se reduce a [-π, π] y nunca devuelve `-0`.
 */
function rotYFromClockwiseDegrees(degrees: number): number {
  let rad = (-degrees * Math.PI) / 180
  if (rad > Math.PI) rad -= 2 * Math.PI
  else if (rad < -Math.PI) rad += 2 * Math.PI
  return rad + 0
}

/**
 * Convierte lo que detectó el análisis en un conjunto de muebles del catálogo local: un mini ambiente de `knownWidthM ?? 4` m de ancho
 * y 75 % de fondo, con `x` e `y` (proporciones del ambiente de la foto) llevadas a metros desde su centro. El tamaño de cada
 * pieza es SIEMPRE el real del catálogo: el `width` y `depth` que estima Gemini no se usan. Se descartan, con aviso (`warn`), las
 * piezas de confianza menor que `MIN_CONFIDENCE` y las que `resolve` no conoce; nunca se las reemplaza por otra pieza. Las
 * repetidas (cuatro sillas) son piezas distintas. Mantiene el orden del análisis.
 */
export function analysisToCluster<T extends ClusterAssetLike>(
  analysis: RoomAnalysis,
  resolve: (assetId: string) => T | undefined,
  opts: AnalysisToClusterOptions = {},
): ClusterPiece<T>[] {
  const roomWidth = Number.isFinite(opts.knownWidthM) && (opts.knownWidthM as number) > 0 ? (opts.knownWidthM as number) : DEFAULT_ROOM_WIDTH_M
  const roomDepth = roomWidth * ROOM_DEPTH_RATIO
  const pieces: ClusterPiece<T>[] = []
  for (const detected of analysis.furniture) {
    const asset = resolve(detected.asset_id)
    if (!asset) {
      opts.warn?.(`El análisis propuso «${detected.asset_id}», que no está en el catálogo de este editor: no se agregó.`)
      continue
    }
    if (detected.confidence < MIN_CONFIDENCE) {
      const percent = Math.round(detected.confidence * 100)
      opts.warn?.(`Se omitió «${nameEs(asset.id, asset.name ?? asset.id)}»: el análisis no está seguro de que esté en la foto (confianza de ${percent} %).`)
      continue
    }
    pieces.push({
      asset,
      at: [round3((detected.x - 0.5) * roomWidth), round3((detected.y - 0.5) * roomDepth)],
      rotY: rotYFromClockwiseDegrees(detected.rotation_deg),
    })
  }
  return pieces
}
