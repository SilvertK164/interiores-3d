import { MIN_CONFIDENCE } from './analysis-to-cluster'
import type { DetectedFurniture, RoomAnalysis } from './schema'

/** Lo que dice la página /laboratorio de un análisis: funciones puras, para probarlas sin navegador. */

const METERS = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })

/** Una proporción del ambiente como porcentaje entero: 0,876 → "88 %". */
export const percent = (value: number): string => `${Math.round(value * 100)} %`

export const pieceCountLabel = (count: number): string => `${count} ${count === 1 ? 'pieza' : 'piezas'}`

/** `low`: por debajo de la confianza con la que «Muebles desde una foto» descarta una pieza. */
export const confidenceLevel = (confidence: number): 'low' | 'ok' => (confidence < MIN_CONFIDENCE ? 'low' : 'ok')

export const positionText = (piece: DetectedFurniture): string => `${percent(piece.x)} del ancho · ${percent(piece.y)} del fondo`
export const sizeText = (piece: DetectedFurniture): string => `${percent(piece.width)} × ${percent(piece.depth)}`
export const rotationText = (piece: DetectedFurniture): string => `${Math.round(piece.rotation_deg)}°`

/** El detalle de una pieza en dos líneas con rótulos, para cuando la tabla no tiene ancho para sus columnas. */
export const detailLines = (piece: DetectedFurniture): [string, string] => [
  `Centro: ${positionText(piece)}`,
  `Tamaño: ${sizeText(piece)} · Giro: ${rotationText(piece)}`,
]

export const originText = (fromExample: boolean): string =>
  fromExample ? 'Análisis de ejemplo: no viene de una foto.' : 'Respuesta del análisis de tu foto.'

export function calibrationText(calibration: RoomAnalysis['calibration']): string {
  return calibration.status === 'user_provided' && calibration.width_m !== null
    ? `Ancho conocido: ${METERS.format(calibration.width_m)} m.`
    : 'Sin ancho conocido: las medidas son proporciones del ambiente.'
}
