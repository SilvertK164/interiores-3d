import { type AnalysisCandidate, pieceLabel } from './analysis-catalog'
import { MIN_CONFIDENCE, WALL_NAMES } from './layout-constants'
import { headingTo, normalizeDeg } from './layout-geometry'
import type { DetectedFurniture, PhotoCamera, RoomOpening, RoomSize } from './schema'

/** Lo que dice y muestra la página /escena-desde-foto de un análisis: funciones puras, para probarlas sin navegador. */

const METERS = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })
/** Un número de metros con coma decimal y a lo más dos decimales: 3,2. */
const num = (value: number): string => METERS.format(value)
/** Metros con su unidad: 3,2 m. */
const m = (value: number): string => `${num(value)} m`

/** Una proporción como porcentaje entero: 0,876 → "88 %" (la confianza de cada pieza). */
export const percent = (value: number): string => `${Math.round(value * 100)} %`

export const pieceCountLabel = (count: number): string => `${count} ${count === 1 ? 'pieza' : 'piezas'}`

/** `low`: por debajo de la confianza con la que el acomodador descarta una pieza. */
export const confidenceLevel = (confidence: number): 'low' | 'ok' => (confidence < MIN_CONFIDENCE ? 'low' : 'ok')

/** Los rumbos cada 45°, en el orden del giro: 0° es el sur y el giro es horario visto desde arriba (90° oeste, 180° norte, 270° este). */
const HEADINGS = ['sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste', 'este', 'sureste'] as const

/** El rumbo más cercano en castellano de un giro en grados (0 = sur, horario): 90 → «oeste». */
export const compassName = (headingDeg: number): string => HEADINGS[Math.round(normalizeDeg(headingDeg) / 45) % 8] as string

/** El tamaño del ambiente que estimó el análisis, en metros. */
export const roomText = (room: RoomSize): string => `Ambiente de ${num(room.width_m)} × ${num(room.depth_m)} m (ancho × fondo)`

/** Desde dónde se tomó la foto (a cuántos metros de los muros oeste y norte) y hacia dónde miraba. */
export function cameraText(camera: PhotoCamera): string {
  const heading = headingTo([camera.x_m, camera.z_m], [camera.look_at.x_m, camera.look_at.z_m])
  const toward = heading === null ? '' : `, mirando hacia el ${compassName(heading)}`
  return `Foto tomada a ${m(camera.x_m)} del muro oeste y ${m(camera.z_m)} del muro norte${toward}.`
}

/** Las puertas y ventanas que encontró el análisis, cada una con su muro. */
export function openingsText(openings: readonly RoomOpening[]): string {
  if (openings.length === 0) return 'No se detectaron puertas ni ventanas.'
  return `Aberturas: ${openings.map((o) => `${o.type === 'door' ? 'puerta' : 'ventana'} en el muro ${WALL_NAMES[o.wall]}`).join(', ')}.`
}

/** Dónde está el centro de una pieza: a cuántos metros del muro oeste (x) y del muro norte (z), el origen del plano; una línea por cada medida. */
export const positionLines = (piece: DetectedFurniture): [string, string] => [`${m(piece.x_m)} del muro oeste`, `${m(piece.z_m)} del muro norte`]

export const positionText = (piece: DetectedFurniture): string => positionLines(piece).join(' · ')

/** Hacia dónde mira el frente de una pieza, en castellano: «mira al sur». */
export const facingText = (piece: DetectedFurniture): string => `mira al ${compassName(piece.facing_deg)}`

/** Cómo está ubicada una pieza: hacia dónde mira y, si corresponde, contra qué muro está («contra el muro norte») y sobre qué se apoya. */
export function placementLines(piece: DetectedFurniture, furniture: readonly DetectedFurniture[], candidates: readonly AnalysisCandidate[]): string[] {
  const lines = [facingText(piece)]
  if (piece.against_wall) lines.push(`contra el muro ${WALL_NAMES[piece.against_wall]}`)
  const support = piece.on_top_of === null ? undefined : furniture[piece.on_top_of]
  if (support) lines.push(`sobre «${pieceLabel(support.asset_id, candidates)}»`)
  return lines
}

/** El detalle de una pieza en dos líneas con rótulos, para cuando la tabla no tiene ancho para sus columnas. */
export const detailLines = (piece: DetectedFurniture, furniture: readonly DetectedFurniture[], candidates: readonly AnalysisCandidate[]): [string, string] => [
  `Centro: ${positionText(piece)}`,
  `Ubicación: ${placementLines(piece, furniture, candidates).join(' · ')}`,
]

export const originText = (fromExample: boolean): string =>
  fromExample ? 'Análisis de ejemplo: no viene de una foto.' : 'Respuesta del análisis de tu foto.'

/**
 * ¿Se muestra «Comprobar que el camino al editor funciona»? Es una herramienta de desarrollo (abre el Loft sin pasar por el análisis):
 * en producción no se ve, salvo con `NEXT_PUBLIC_E2E=1`, que es como corren las pruebas en navegador (`next.config.mjs`, `ProjectEditor`).
 */
export const showEditorPathTool = ({ nodeEnv, e2e }: { nodeEnv?: string; e2e?: string }): boolean => nodeEnv !== 'production' || e2e === '1'
