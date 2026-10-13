import { footprint } from '@/lib/templates/geometry'
import { createClickGuard } from '../click-guard'
import { DECISIONS, type Decisions } from '../decisions'
import type { CatalogItemLike } from '../furniture-model'
import { roundMm } from '../properties-units'
import type { CoreDeps } from './core'
import { levelsOf } from './levels'
import type { SceneNodeLike } from './types'

type Pt = readonly [number, number]

/**
 * Una pieza del conjunto tal como la arma `analysisToCluster`: el mueble del catálogo local (con su tamaño real), su centro `at =
 * [x, z]` en metros (+x a la derecha, +z hacia abajo) y su `rotY` de Pascal. Las posiciones son entre sí; el puente las lleva a la
 * planta.
 */
export type ClusterPiece = { asset: CatalogItemLike; at: Pt; rotY: number }

/** Lo que `insertItems` crea: el mueble, su posición en la planta (x, y, z) y su giro. */
export type ClusterItem = { asset: CatalogItemLike; position: [number, number, number]; rotY: number }

export type ClusterDeps = {
  /**
   * Crea los muebles como hijos de esa planta, todos en UN solo paso del historial (Deshacer los quita juntos), con los mismos
   * nodos que arma el constructor de plantillas, y devuelve sus ids en el mismo orden. En Ver (solo lectura) Pascal no crea nada.
   */
  insertItems(input: { parentId: string; items: readonly ClusterItem[] }): string[]
}

type PlanNode = SceneNodeLike & { polygon?: readonly Pt[]; start?: Pt; end?: Pt }
type Box = { minX: number; maxX: number; minZ: number; maxZ: number }

/** Pascal sube cada pieza apoyada en el piso el espesor de la losa al dibujarla: la posición guardada es 0 (como en las plantillas). */
const FLOOR_Y = 0
/** Medida de un mueble sin `dimensions`: la que usa Pascal por omisión (1 x 1 x 1 m). */
const DEFAULT_SIDE = 1
/** Al milímetro y nunca `-0` (un `-0` suelto no es igual a `0` para quien compare con `Object.is`). */
const mm = (n: number) => roundMm(n) + 0

function boxOf(points: readonly Pt[]): Box | null {
  if (points.length === 0) return null
  const xs = points.map((p) => p[0])
  const zs = points.map((p) => p[1])
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }
}

const centerOfBox = (box: Box): Pt => [(box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2]

/** Centro de un ambiente: el centroide de su área; si no tiene área (menos de tres puntos o alineados), el centro de su caja. */
function polygonCenter(polygon: readonly Pt[]): Pt | null {
  const box = boxOf(polygon)
  if (!box) return null
  let twice = 0
  let sumX = 0
  let sumZ = 0
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length] as Pt
    const cross = a[0] * b[1] - b[0] * a[1]
    twice += cross
    sumX += (a[0] + b[0]) * cross
    sumZ += (a[1] + b[1]) * cross
  })
  return Math.abs(twice) < 1e-9 ? centerOfBox(box) : [sumX / (3 * twice), sumZ / (3 * twice)]
}

/** Centro de una planta: la caja que envuelve a sus muros, ambientes, pisos y cielos; el origen si no tiene nada dibujado. */
function levelCenter(nodes: Readonly<Record<string, SceneNodeLike>>, level: SceneNodeLike): Pt {
  const points = (level.children ?? []).flatMap((id): Pt[] => {
    const node = nodes[id] as PlanNode | undefined
    if (node?.type === 'wall') return [node.start, node.end].filter((p): p is Pt => Array.isArray(p) && p.length >= 2)
    if (node?.type === 'zone' || node?.type === 'slab' || node?.type === 'ceiling') return [...(node.polygon ?? [])]
    return []
  })
  const box = boxOf(points)
  return box ? centerOfBox(box) : [0, 0]
}

/** La caja que envuelve las huellas de todas las piezas (con su giro), entre sí. */
function clusterBox(pieces: readonly ClusterPiece[]): Box | null {
  return boxOf(
    pieces.flatMap((piece) => {
      const [width, , depth] = piece.asset.dimensions ?? [DEFAULT_SIDE, DEFAULT_SIDE, DEFAULT_SIDE]
      return footprint([piece.at[0], piece.at[1]], width, depth, piece.rotY)
    }),
  )
}

export function createClusterSlice(deps: CoreDeps & ClusterDeps, decisions: Pick<Decisions, 'furnishPhaseBeforeItem'> = DECISIONS) {
  const allowInsert = createClickGuard()
  return {
    cluster: {
      /**
       * Agrega un conjunto de muebles a una planta (`levelId`, o la activa, o la más baja) en UN solo paso del historial, con el
       * centro del conjunto en el centro del ambiente elegido (el de esa planta) o, si no hay, en el de la planta. Los deja todos
       * elegidos juntos (los mueves, giras o borras a la vez con la multiselección de Pascal) y pasa a Seleccionar. Devuelve sus
       * ids; en Ver, sin piezas, sin planta o con un doble clic no hace nada y devuelve una lista vacía.
       */
      insert(pieces: readonly ClusterPiece[], levelId?: string): string[] {
        const scene = deps.scene.getState()
        const viewer = deps.viewer.getState()
        const box = clusterBox(pieces)
        if (scene.readOnly || !box) return []
        const { buildingId, levels } = levelsOf(scene, viewer)
        const target = levelId ? levels.find((l) => l.id === levelId) : (levels.find((l) => l.id === viewer.selection.levelId) ?? levels[0])
        if (!target || !allowInsert()) return []

        const zone = viewer.selection.zoneId ? (scene.nodes[viewer.selection.zoneId] as PlanNode | undefined) : undefined
        const center = (zone?.type === 'zone' && zone.parentId === target.id ? polygonCenter(zone.polygon ?? []) : null) ?? levelCenter(scene.nodes, target)
        const here = centerOfBox(box)
        const items = pieces.map((piece): ClusterItem => ({
          asset: piece.asset,
          position: [mm(piece.at[0] + center[0] - here[0]), FLOOR_Y, mm(piece.at[1] + center[1] - here[1])],
          rotY: piece.rotY,
        }))
        const ids = deps.insertItems({ parentId: target.id, items })
        if (ids.length === 0) return []

        // Primero la fase y la herramienta (Pascal puede tocar la selección al cambiarlas), al final la selección.
        const editor = deps.editor.getState()
        if (decisions.furnishPhaseBeforeItem && editor.phase !== 'furnish') editor.setPhase('furnish')
        if (deps.editor.getState().mode !== 'select') deps.editor.getState().armToolMode({ mode: 'select' })
        deps.viewer.getState().setSelection({ ...(buildingId ? { buildingId } : {}), levelId: target.id, zoneId: null, selectedIds: ids })
        return ids
      },
    },
  }
}
