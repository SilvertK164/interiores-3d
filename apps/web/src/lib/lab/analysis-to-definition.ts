import { nameEs } from '../catalog-es'
import { perimeter } from '../templates/geometry'
import type { ItemDef, OpeningDef, Pt, TemplateDefinition } from '../templates/types'
import { type ClusterAssetLike, type ClusterPiece, analysisToCluster, roomSize } from './analysis-to-cluster'
import type { RoomAnalysis } from './schema'

/**
 * Del análisis de una foto al proyecto: el ambiente de la foto (un solo nivel, rectangular, con sus cuatro muros, una puerta, una
 * ventana y un piso de madera clara) con los muebles que reconoció el análisis ya puestos dentro. Es lo que usa «Escena desde una
 * foto» para abrir el editor: `openDefinitionAsProject` (`src/editor/lab-scene.ts`) la dibuja con `buildScene`, como a cualquier plantilla.
 * Es pura (sin Pascal ni DOM) y tiene su guía de ideas para mejorarla en `lab/README.md`.
 *
 * Las suposiciones del ambiente son las de `analysisToCluster` (`roomSize`: `knownWidthM ?? 4` m de ancho y 75 % de fondo) y las
 * piezas son las suyas (tamaño real del catálogo, giro de Pascal, descartes con aviso). Aquí se pasan a coordenadas absolutas
 * dentro del ambiente y se recortan para que ninguna cruce un muro. Todo lo que se mueve o se deja afuera se cuenta con `warn`.
 */

/** Lo que se le pide a una pieza local: id, nombre y, si se conoce, el tamaño real `[ancho, alto, fondo]` de su catálogo. */
export type AnalysisAssetLike = ClusterAssetLike & { dimensions?: readonly number[] }

/** Lo que `analysisToDefinition` recibe además del análisis y del catálogo. */
export type AnalysisToDefinitionOptions = {
  /** Ancho del ambiente en metros si la persona lo escribió en el formulario; vacío, `null` o inválido = 4 m. */
  knownWidthM?: number | null
  /** Para contarle a la persona lo que se movió, se achicó o se dejó afuera: la página lo muestra junto a los avisos del análisis. */
  warn?: (message: string) => void
}

/** Distancia mínima entre el borde de una pieza y el eje de un muro: el muro mide 20 cm, así que quedan 10 cm hasta su cara. */
export const WALL_CLEARANCE_M = 0.2
/** Un ambiente más angosto no tiene sentido y sus muros no pasarían el validador de plantillas (0,3 m como mínimo). */
export const MIN_ROOM_WIDTH_M = 1
/** Madera clara de la biblioteca de Pascal (roble claro: «Madera fina 2»). */
export const FLOOR_MATERIAL = 'wood-woodfine2'

const WALL_INSIDE = 'preset-softwhite'
const WALL_OUTSIDE = 'concrete-stucco'
const CEILING = 'concrete-plaster'
/** Un ajuste menor que esto no se avisa: la posición que da el análisis de una foto no es tan precisa. */
const MOVE_TOLERANCE_M = 0.05

type Side = 'n' | 'e' | 's' | 'w'
type Span = [number, number]
/** El ambiente de la foto, rectangular, en metros: `width` en x (izquierda a derecha de la foto) y `depth` en z (de y = 0, el fondo, a y = 1, quien mira). */
export type Room = { width: number; depth: number }
/** Lo que ocupa una pieza en el plano, en metros desde la esquina (0, 0) del ambiente. */
type Box = { x0: number; x1: number; z0: number; z1: number }

const WALL_NAMES: Record<Side, string> = { n: 'Muro norte', e: 'Muro este', s: 'Muro sur', w: 'Muro oeste' }
const round3 = (n: number) => Math.round(n * 1000) / 1000 + 0
const METERS = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })
const meters = (n: number) => `${METERS.format(n)} m`

/**
 * El ambiente de la foto: `knownWidthM ?? 4` m de ancho (nunca menos de `MIN_ROOM_WIDTH_M`) por el 75 % de fondo (`roomSize`). Lo usan
 * `analysisToDefinition` (que avisa con `warn` si tuvo que subir un ancho demasiado chico) y la cámara con la que abre el editor
 * (`photoCameraPose`): así los dos hablan siempre del mismo ambiente.
 */
export function photoRoom(knownWidthM?: number | null, warn: (message: string) => void = () => {}): Room {
  const asked = roomSize(knownWidthM).width
  if (asked < MIN_ROOM_WIDTH_M) warn(`El ancho indicado (${meters(asked)}) es demasiado chico para un ambiente: se usó ${meters(MIN_ROOM_WIDTH_M)}.`)
  const width = round3(Math.max(asked, MIN_ROOM_WIDTH_M))
  return { width, depth: round3(roomSize(width).depth) }
}

/** Mitades del rectángulo que ocupa la pieza una vez girada `rotY` (ejes x y z del plano); `[0, 0]` si no se conocen sus medidas. */
function halfExtents(asset: AnalysisAssetLike, rotY: number): Pt {
  const [width, , depth] = asset.dimensions ?? []
  if (!(typeof width === 'number' && typeof depth === 'number' && width > 0 && depth > 0)) return [0, 0]
  const c = Math.abs(Math.cos(rotY))
  const s = Math.abs(Math.sin(rotY))
  return [(c * width + s * depth) / 2, (s * width + c * depth) / 2]
}

/** El centro llevado a que el borde de la pieza (su mitad `half`) quede a `WALL_CLEARANCE_M` del muro; si no cabe, al medio. */
function fitAxis(center: number, half: number, size: number): { value: number; fits: boolean } {
  const min = WALL_CLEARANCE_M + half
  const max = size - WALL_CLEARANCE_M - half
  if (min > max) return { value: size / 2, fits: false }
  return { value: Math.min(Math.max(center, min), max), fits: true }
}

/** Las piezas de `analysisToCluster` (relativas al centro) en coordenadas absolutas del ambiente, recortadas para no cruzar los muros. */
function placePieces<T extends AnalysisAssetLike>(pieces: readonly ClusterPiece<T>[], room: Room, warn: (message: string) => void) {
  const items: ItemDef[] = []
  const boxes: Box[] = []
  for (const { asset, at, rotY } of pieces) {
    const [hx, hz] = halfExtents(asset, rotY)
    const wanted: Pt = [room.width / 2 + at[0], room.depth / 2 + at[1]]
    const x = fitAxis(wanted[0], hx, room.width)
    const z = fitAxis(wanted[1], hz, room.depth)
    const placed: Pt = [round3(x.value), round3(z.value)]
    const label = nameEs(asset.id, asset.name ?? asset.id)
    const moved = Math.hypot(placed[0] - wanted[0], placed[1] - wanted[1])
    if (!(x.fits && z.fits)) {
      warn(`«${label}» (${meters(2 * hx)} × ${meters(2 * hz)}) no cabe en el ambiente de ${meters(room.width)} × ${meters(room.depth)}: se dejó en el centro y puede tocar los muros.`)
    } else if (moved >= MOVE_TOLERANCE_M) {
      warn(`«${label}» quedaba fuera del ambiente o muy cerca del muro: se movió ${meters(moved)} hacia adentro.`)
    }
    items.push({ asset: asset.id, at: placed, rotY })
    boxes.push({ x0: placed[0] - hx, x1: placed[0] + hx, z0: placed[1] - hz, z1: placed[1] + hz })
  }
  return { items, boxes }
}

// --- Puerta y ventana --------------------------------------------------------------------------------------------------------
/** Separación mínima con la esquina (el validador pide 10 cm; con muros de 20 cm se ve mejor con 30). */
const OPENING_MARGIN_M = 0.3
/** Un mueble a menos de esto del eje del muro tapa lo que haya en ese tramo (más `OPENING_AIR_M` de aire a cada lado). */
const OPENING_CLEAR_M = 0.5
const OPENING_AIR_M = 0.1
const SCAN_STEP_M = 0.05
const EPS = 1e-6

type OpeningKind = { id: string; type: OpeningDef['type']; name: string; order: Side[]; min: number; width: (wallLength: number) => number }
/** La puerta prefiere el muro de quien mira la foto (sur); la ventana, el del fondo (norte). Cada una prueba los demás si hay muebles delante. */
const DOOR: OpeningKind = { id: 'puerta', type: 'door', name: 'Puerta', order: ['s', 'w', 'e', 'n'], min: 0.6, width: () => 0.9 }
const WINDOW: OpeningKind = { id: 'ventana', type: 'window', name: 'Ventana', order: ['n', 'e', 'w', 's'], min: 0.5, width: (length) => Math.min(2.2, Math.round(length * 3.5) / 10) }

const overlap = (lo: number, hi: number, spans: readonly Span[]) => spans.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(hi, b) - Math.max(lo, a)), 0)

/** Los tramos de un muro (a lo largo de él) que tienen un mueble pegado delante. */
function blockedSpans(side: Side, boxes: readonly Box[], room: Room): Span[] {
  const spans: Span[] = []
  for (const b of boxes) {
    const gap = side === 'n' ? b.z0 : side === 's' ? room.depth - b.z1 : side === 'w' ? b.x0 : room.width - b.x1
    if (gap >= OPENING_CLEAR_M) continue
    spans.push(side === 'n' || side === 's' ? [b.x0 - OPENING_AIR_M, b.x1 + OPENING_AIR_M] : [b.z0 - OPENING_AIR_M, b.z1 + OPENING_AIR_M])
  }
  return spans
}

/** El centro de una abertura de `width` sobre un muro de `length` que menos pisa los tramos tapados y, a igual pisada, el más cercano al medio. */
function bestAlong(length: number, width: number, spans: readonly Span[]) {
  const min = OPENING_MARGIN_M + width / 2
  const max = length - OPENING_MARGIN_M - width / 2
  if (min > max) return null
  const anchor = length / 2
  const candidates = [anchor, max]
  for (let at = min; at < max; at += SCAN_STEP_M) candidates.push(at)
  let best: { at: number; covered: number; distance: number } | null = null
  for (const at of candidates) {
    const covered = overlap(at - width / 2, at + width / 2, spans)
    const distance = Math.abs(at - anchor)
    if (!best || covered < best.covered - EPS || (covered <= best.covered + EPS && distance < best.distance - EPS)) best = { at, covered, distance }
  }
  return best
}

/** Dónde va una abertura: el primer muro (en su orden de preferencia) con un tramo libre; si todos están tapados, donde menos se pisa. */
function placeOpening(kind: OpeningKind, room: Room, boxes: readonly Box[], taken: Partial<Record<Side, Span>> = {}) {
  let best: { side: Side; at: number; width: number; covered: number } | null = null
  for (const side of kind.order) {
    const length = side === 'n' || side === 's' ? room.width : room.depth
    const width = round3(Math.min(kind.width(length), length - 2 * OPENING_MARGIN_M))
    if (width < kind.min) continue
    const spans = blockedSpans(side, boxes, room)
    const other = taken[side]
    if (other) spans.push([other[0] - 2 * OPENING_AIR_M, other[1] + 2 * OPENING_AIR_M])
    const found = bestAlong(length, width, spans)
    if (found && (!best || found.covered < best.covered - EPS)) best = { side, at: found.at, width, covered: found.covered }
    if (best && best.covered < EPS) break
  }
  if (!best) return null
  const opening: OpeningDef = { id: kind.id, type: kind.type, wall: `p-${best.side}`, at: round3(best.at), width: best.width, name: kind.name }
  return { side: best.side, opening }
}

/** Última red de seguridad: en un mismo muro dos aberturas nunca se pisan (el validador lo rechaza); si pasara, se omite la segunda con aviso. */
function withoutOverlaps(openings: OpeningDef[], warn: (message: string) => void): OpeningDef[] {
  const kept: OpeningDef[] = []
  for (const opening of openings) {
    const clash = kept.some((other) => other.wall === opening.wall && other.at + other.width / 2 > opening.at - opening.width / 2 + EPS && opening.at + opening.width / 2 > other.at - other.width / 2 + EPS)
    if (clash) warn(`No hubo lugar libre para la ${opening.name?.toLowerCase() ?? 'abertura'}: se omitió.`)
    else kept.push(opening)
  }
  return kept
}

/**
 * Convierte lo que detectó el análisis de una foto en la definición de un ambiente (un `TemplateDefinition` de un nivel) con sus
 * muros, una puerta, una ventana, piso de madera clara y los muebles del análisis dentro. No inventa nada: las piezas que el análisis
 * da con poca confianza o que el catálogo no tiene se descartan con aviso (`analysisToCluster`) y las que se saldrían del ambiente
 * se acercan al interior hasta quedar a 0,2 m del muro (`WALL_CLEARANCE_M`), también con aviso. `resolve` es el catálogo local:
 * devuelve la pieza de un `asset_id` (con su tamaño real) o `undefined` si no la tiene.
 */
export function analysisToDefinition<T extends AnalysisAssetLike>(
  analysis: RoomAnalysis,
  resolve: (assetId: string) => T | undefined,
  opts: AnalysisToDefinitionOptions = {},
): TemplateDefinition {
  const warn = opts.warn ?? (() => {})
  const room = photoRoom(opts.knownWidthM, warn)

  const pieces = analysisToCluster(analysis, resolve, { knownWidthM: room.width, warn })
  const { items, boxes } = placePieces(pieces, room, warn)
  const door = placeOpening(DOOR, room, boxes)
  const doorSpan: Span | null = door ? [door.opening.at - door.opening.width / 2, door.opening.at + door.opening.width / 2] : null
  let window = placeOpening(WINDOW, room, boxes, door && doorSpan ? { [door.side]: doorSpan } : {})
  // Con muebles pegados a todos los muros, la ventana puede caer sobre la puerta: se prueba en los otros muros y, si no hay lugar, se omite.
  if (window && door && doorSpan && window.side === door.side && overlap(window.opening.at - window.opening.width / 2, window.opening.at + window.opening.width / 2, [doorSpan]) > EPS) {
    window = placeOpening({ ...WINDOW, order: WINDOW.order.filter((side) => side !== door.side) }, room, boxes)
    if (!window) warn('No hubo lugar libre para la ventana: el ambiente quedó solo con la puerta.')
  }

  return {
    id: 'foto',
    kind: 'vivienda',
    name: 'Escena desde una foto',
    summary: 'Un ambiente con puerta, ventana y piso de madera clara, con los muebles que reconocimos en tu foto.',
    levels: [
      {
        id: 'pb',
        wallInside: WALL_INSIDE,
        wallOutside: WALL_OUTSIDE,
        trim: true,
        walls: perimeter('p', 0, 0, room.width, room.depth).map((wall) => ({ ...wall, name: WALL_NAMES[wall.id.slice(-1) as Side] })),
        rooms: [{ id: 'ambiente', name: 'Ambiente', color: '#1F5FE0', rect: [0, 0, room.width, room.depth], floor: FLOOR_MATERIAL, ceiling: CEILING }],
        openings: withoutOverlaps([door, window].flatMap((placed) => (placed ? [placed.opening] : [])), warn),
        items,
      },
    ],
  }
}
