import { nameEs } from '../catalog-es'
import { footprint } from '../templates/geometry'
import type { ItemDef, LevelDef, OpeningDef, Pt, TemplateDefinition, WallDef } from '../templates/types'
import { compassName, roomText } from './lab-view'
import { WALL_NAMES } from './layout-constants'
import { headingTo, round3 } from './layout-geometry'
import { type Box, type Frame, type LabelRequest, type PreviewLabel, placeLabels, shortLabel } from './plan-preview-labels'
import { photoCameraPose } from './photo-camera'
import type { PhotoCamera, WallSide } from './schema'

export { shortLabel } from './plan-preview-labels'
export type { PreviewLabel } from './plan-preview-labels'

/**
 * La vista previa «desde arriba» de /escena-desde-foto: del `TemplateDefinition` que armó `analysisToDefinition` y de las medidas del catálogo local
 * sale todo lo que hay que dibujar, en metros del plano (x al este, z al sur, el norte arriba): el ambiente y sus muros, las puertas y ventanas
 * sobre su muro, cada pieza como un rectángulo de su tamaño real y su giro con una flecha en su frente, su etiqueta corta, y desde dónde se tomó la
 * foto y hacia dónde apunta. Es pura (sin Pascal, three ni DOM); `ScenePlanPreview` solo la dibuja.
 */

/** Lo único que se le pide a una pieza del catálogo: su id, su nombre (si lo tiene) y su tamaño real `[ancho, alto, fondo]`. */
export type PreviewAsset = { id: string; name?: string; dimensions?: readonly number[] }

export type PreviewPiece = {
  /** Único dentro del plano (el índice en la definición): para la clave de React. */
  key: string
  asset: string
  /** Nombre completo en castellano. */
  name: string
  kind: 'rug' | 'piece'
  /** Apoyada sobre otra pieza (la tele sobre su mueble): se dibuja encima. */
  stacked: boolean
  /** Las cuatro esquinas de su huella, ya giradas. */
  corners: Pt[]
  /** Hacia dónde mira su frente en el plano (vector unitario). */
  forward: Pt
  /** La flecha de su frente (`tip` es la punta; `base`, sus dos extremos sobre el borde); `null` si no tiene frente (alfombras, plantas, lámparas). */
  front: { tip: Pt; base: [Pt, Pt] } | null
  label: PreviewLabel | null
}

export type PreviewOpening = {
  id: string
  type: 'door' | 'window'
  name: string
  /** El tramo de muro que ocupa (un rectángulo apenas más grueso que el muro). */
  corners: Pt[]
  /** Solo las puertas: la hoja abierta hacia adentro (`leaf`: de la bisagra a la punta) y el arco que barre (`arc`: un camino SVG). */
  swing: { leaf: [Pt, Pt]; arc: string } | null
}

export type PreviewCamera = {
  at: Pt
  /** El cono de lo que ve: la cámara y los dos extremos del campo de visión. */
  cone: [Pt, Pt, Pt]
  /** Hacia dónde mira, en grados (0 = al sur, horario), o `null` si apunta a su propio punto. */
  heading: number | null
  label: PreviewLabel | null
}

export type PlanPreview = {
  viewBox: { x: number; y: number; width: number; height: number }
  /** El tamaño de la letra, en metros del plano: se lee igual con cualquier ambiente. */
  fontSize: number
  room: { x0: number; z0: number; x1: number; z1: number }
  walls: { id: string; from: Pt; to: Pt }[]
  openings: PreviewOpening[]
  /** En el orden en que se dibujan: primero las alfombras, después lo que está en el piso (lo grande antes) y al final lo apoyado. */
  pieces: PreviewPiece[]
  camera: PreviewCamera | null
  /** El texto alternativo: ambiente, piezas, aberturas y cámara en una o dos frases. */
  summary: string
}

const MARGIN_M = 0.35
const WALL_HALF_M = 0.08
const CAMERA_R_M = 0.16
const FALLBACK_SIZE: [number, number, number] = [0.5, 0.5, 0.5]
const CONE_HALF_DEG = 30
const CONE_LENGTH_M = 1.5
const NO_FRONT = /carpet|rug|plant|cactus|lamp/

const pt = (x: number, z: number): Pt => [round3(x), round3(z)]
const rad = (deg: number) => (deg * Math.PI) / 180

function pieceOf(item: ItemDef, index: number, resolve: (id: string) => PreviewAsset | undefined): PreviewPiece {
  const asset = resolve(item.asset)
  const [width, , depth] = (asset?.dimensions?.length === 3 ? asset.dimensions : FALLBACK_SIZE) as [number, number, number]
  const rotY = item.rotY ?? 0
  const corners = footprint(item.at, width, depth, rotY)
  const forward: Pt = [Math.sin(rotY), Math.cos(rotY)] // el frente de la pieza (su eje z local) en el plano
  const side: Pt = [Math.cos(rotY), -Math.sin(rotY)]
  const size = Math.min(Math.max(0.35 * Math.min(width, depth), 0.1), 0.22)
  const edge = (reach: number, across: number): Pt => pt(item.at[0] + forward[0] * reach + side[0] * across, item.at[1] + forward[1] * reach + side[1] * across)
  const rug = /carpet|rug/.test(item.asset)
  return {
    key: `${index}-${item.asset}`,
    asset: item.asset,
    name: nameEs(item.asset, asset?.name ?? item.asset),
    kind: rug ? 'rug' : 'piece',
    stacked: (item.y ?? 0) > 0,
    corners,
    forward: pt(forward[0], forward[1]),
    front: NO_FRONT.test(item.asset) ? null : { tip: edge(depth / 2 + size, 0), base: [edge(depth / 2 - 0.01, -size * 0.7), edge(depth / 2 - 0.01, size * 0.7)] },
    label: null,
  }
}

const bounds = (points: readonly Pt[]): [number, number, number, number] => {
  const xs = points.map((p) => p[0])
  const zs = points.map((p) => p[1])
  return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
}
const boxOf = (piece: PreviewPiece): Box => {
  const [x0, x1, z0, z1] = bounds(piece.corners)
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, width: x1 - x0, height: z1 - z0 }
}
const area = (piece: PreviewPiece): number => {
  const [x0, x1, z0, z1] = bounds(piece.corners)
  return (x1 - x0) * (z1 - z0)
}

function openingOf(opening: OpeningDef, walls: readonly WallDef[], room: PlanPreview['room']): PreviewOpening | null {
  const wall = walls.find((candidate) => candidate.id === opening.wall)
  if (!wall) return null
  const length = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1])
  if (length === 0) return null
  const u: Pt = [(wall.to[0] - wall.from[0]) / length, (wall.to[1] - wall.from[1]) / length]
  // La normal que mira hacia adentro del ambiente.
  const toRoom: Pt = [(room.x0 + room.x1) / 2 - wall.from[0], (room.z0 + room.z1) / 2 - wall.from[1]]
  const sign = (-u[1]) * toRoom[0] + u[0] * toRoom[1] >= 0 ? 1 : -1
  const n: Pt = [-u[1] * sign, u[0] * sign]
  const at = (along: number, across: number): Pt => pt(wall.from[0] + u[0] * along + n[0] * across, wall.from[1] + u[1] * along + n[1] * across)
  const start = opening.at - opening.width / 2
  const end = opening.at + opening.width / 2
  const corners = [at(start, -WALL_HALF_M), at(end, -WALL_HALF_M), at(end, WALL_HALF_M), at(start, WALL_HALF_M)]
  const name = opening.name ?? (opening.type === 'door' ? 'Puerta' : 'Ventana')
  if (opening.type === 'window') return { id: opening.id, type: 'window', name, corners, swing: null }
  const hinge = at(start, 0)
  const tip = at(start, opening.width)
  const closed = at(end, 0)
  const cross = (closed[0] - hinge[0]) * (tip[1] - hinge[1]) - (closed[1] - hinge[1]) * (tip[0] - hinge[0])
  const arc = `M ${closed[0]} ${closed[1]} A ${opening.width} ${opening.width} 0 0 ${cross > 0 ? 1 : 0} ${tip[0]} ${tip[1]}`
  return { id: opening.id, type: 'door', name, corners, swing: { leaf: [hinge, tip], arc } }
}

function cameraOf(camera: PhotoCamera, room: { width: number; depth: number }): PreviewCamera {
  const pose = photoCameraPose(room, camera)
  const at = pt(pose.position[0], pose.position[2])
  const heading = headingTo(at, [pose.target[0], pose.target[2]])
  const dir: Pt = [pose.target[0] - at[0], pose.target[2] - at[1]]
  const norm = Math.hypot(dir[0], dir[1]) || 1
  const length = Math.min(CONE_LENGTH_M, 0.45 * Math.max(room.width, room.depth))
  const turned = (deg: number): Pt => {
    const c = Math.cos(rad(deg))
    const s = Math.sin(rad(deg))
    return pt(at[0] + ((dir[0] * c - dir[1] * s) / norm) * length, at[1] + ((dir[0] * s + dir[1] * c) / norm) * length)
  }
  return { at, cone: [at, turned(-CONE_HALF_DEG), turned(CONE_HALF_DEG)], heading, label: null }
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** Las frases del texto alternativo. */
function summaryOf(width: number, depth: number, pieces: number, openings: readonly PreviewOpening[], camera: PreviewCamera | null): string {
  const doors = openings.filter((o) => o.type === 'door').length
  const windows = openings.length - doors
  const parts = [pieces === 0 ? 'sin muebles' : plural(pieces, 'mueble', 'muebles')]
  if (openings.length === 0) parts.push('sin puertas ni ventanas')
  else {
    if (doors > 0) parts.push(plural(doors, 'puerta', 'puertas'))
    if (windows > 0) parts.push(plural(windows, 'ventana', 'ventanas'))
  }
  const list = openings.length === 0 ? parts.join(', ') : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
  const size = roomText({ width_m: width, depth_m: depth }).replace(' (ancho × fondo)', '').replace('Ambiente de', 'un ambiente de')
  const first = `Vista desde arriba de ${size} con ${list}.`
  if (!camera) return first
  const wall = (Object.entries({ n: camera.at[1], s: depth - camera.at[1], w: camera.at[0], e: width - camera.at[0] }) as [WallSide, number][]).sort((a, b) => a[1] - b[1])[0]?.[0] ?? 's'
  const toward = camera.heading === null ? '' : `, mirando hacia el ${compassName(camera.heading)}`
  return `${first} La foto se tomó desde el muro ${WALL_NAMES[wall]}${toward}.`
}

/**
 * Lo que hay que dibujar para ver desde arriba la escena de `definition` (su primera planta): `resolve` da las medidas reales de cada pieza del
 * catálogo local y `camera`, si se pasa, dónde estaba quien sacó la foto (con la misma corrección que usa el editor, `photoCameraPose`).
 */
export function planPreview(definition: TemplateDefinition, resolve: (id: string) => PreviewAsset | undefined, camera?: PhotoCamera): PlanPreview {
  const level = definition.levels[0] as LevelDef
  const [x0, z0, x1, z1] = level.rooms[0]?.rect ?? [0, 0, 0, 0]
  const room = { x0, z0, x1, z1 }
  const walls = level.walls.map(({ id, from, to }) => ({ id, from, to }))
  const openings = level.openings.flatMap((opening) => openingOf(opening, level.walls, room) ?? [])
  const shapes = level.items.map((item, index) => pieceOf(item, index, resolve))
  const rank = (piece: PreviewPiece) => (piece.kind === 'rug' ? 0 : piece.stacked ? 2 : 1)
  const pieces = [...shapes].sort((a, b) => rank(a) - rank(b) || area(b) - area(a))
  const photo = camera ? cameraOf(camera, { width: x1 - x0, depth: z1 - z0 }) : null

  // La caja de dibujo: el ambiente con su margen y, si algo sobresale (una flecha, el cono de la cámara), también eso.
  const reach: Pt[] = [[x0, z0], [x1, z1], ...pieces.flatMap((p) => [...p.corners, ...(p.front ? [p.front.tip] : [])]), ...(photo ? photo.cone : [])]
  const [bx0, bx1, bz0, bz1] = bounds(reach)
  const viewBox = { x: round3(bx0 - MARGIN_M), y: round3(bz0 - MARGIN_M), width: round3(bx1 - bx0 + 2 * MARGIN_M), height: round3(bz1 - bz0 + 2 * MARGIN_M) }
  // A 390 px de ancho la letra tiene que medir 11 px o más: 0,036 del ancho; en un ambiente alto alcanza con 1/44 del lado mayor.
  const fontSize = round3(Math.max(Math.max(viewBox.width, viewBox.height) / 44, viewBox.width * 0.036))

  // Las etiquetas: la de la cámara primero, después lo que está en el piso y lo apoyado (lo grande antes) y al final las alfombras, que van al
  // fondo y se conforman con un borde.
  const inner: Frame = [x0 + 0.06, z0 + 0.06, x1 - 0.06, z1 - 0.06]
  const labelOrder = [...pieces.filter((p) => p.kind !== 'rug'), ...pieces.filter((p) => p.kind === 'rug')]
  const [cx, cz] = photo?.at ?? [0, 0]
  const solid = pieces.filter((p) => p.kind !== 'rug' && !p.stacked)
  const requests: LabelRequest[] = [
    ...(photo ? [{ text: 'Cámara', bounds: [cx - CAMERA_R_M, cx + CAMERA_R_M, cz - CAMERA_R_M, cz + CAMERA_R_M] as LabelRequest['bounds'], front: [-1, 0] as Pt }] : []),
    ...labelOrder.map((piece) => ({
      text: shortLabel(piece.asset, piece.name),
      bounds: bounds(piece.corners),
      front: piece.front ? piece.forward : null,
      // Una etiqueta no tapa a otra pieza del piso (las alfombras quedan debajo de todo y lo apoyado va sobre su soporte).
      avoid: piece.stacked ? [] : solid.filter((other) => other !== piece).map(boxOf),
    })),
  ]
  const icon: Box[] = photo ? [{ x: cx, z: cz, width: 2 * CAMERA_R_M, height: 2 * CAMERA_R_M }] : []
  const placed = placeLabels(requests, inner, fontSize, icon)
  const cameraLabel = photo ? (placed.shift() ?? null) : null
  const labelOf = new Map(labelOrder.map((piece, index) => [piece.key, placed[index] ?? null]))
  const labelled = pieces.map((piece) => ({ ...piece, label: labelOf.get(piece.key) ?? null }))
  const summary = summaryOf(x1 - x0, z1 - z0, pieces.length, openings, photo)
  return { viewBox, fontSize, room, walls, openings, pieces: labelled, camera: photo && { ...photo, label: cameraLabel }, summary }
}
