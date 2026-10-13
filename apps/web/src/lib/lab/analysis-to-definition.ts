import { perimeter } from '../templates/geometry'
import type { ItemDef, OpeningDef, TemplateDefinition } from '../templates/types'
import { WALL_NAMES } from './layout-constants'
import { solveLayout } from './layout-solver'
import type { PlacedOpening, SolverAsset } from './layout-types'
import type { RoomAnalysis, WallSide } from './schema'

/**
 * Del plano de una foto al proyecto: el ambiente del tamaño que estimó Gemini (un solo nivel, rectangular, con sus cuatro muros, un piso de
 * madera clara y el cielo), las puertas y ventanas en los muros que dijo y los muebles en sus posiciones, con su giro y su altura. Es lo
 * que usa «Escena desde una foto» para abrir el editor: `openDefinitionAsProject` (`src/editor/lab-scene.ts`) la dibuja con `buildScene`,
 * como a cualquier plantilla. Es pura (sin Pascal ni DOM) y tiene sus reglas fijadas en `test/lab-analysis-to-definition.test.ts`.
 *
 * El plano pasa antes por el acomodador (`solveLayout`, `layout-solver.ts`), que lo corrige: nada fuera del ambiente ni solapado, lo que va
 * contra un muro mira hacia adentro, los asientos miran a su foco y lo apoyado sube a la altura real de su soporte. Todo lo que mueve o deja
 * afuera se cuenta con `warn`. Aquí solo se lleva ese resultado a las coordenadas de `TemplateDefinition`: el ambiente es el rectángulo
 * `[0, 0, ancho, fondo]` (x al este, z al sur, como en Gemini) y los muros van sobre sus bordes.
 */

/** Lo que se le pide a una pieza local: id, nombre y, si se conoce, el tamaño real `[ancho, alto, fondo]` de su catálogo. */
export type AnalysisAssetLike = SolverAsset

/** Lo que `analysisToDefinition` recibe además del análisis y del catálogo. */
export type AnalysisToDefinitionOptions = {
  /** Para contarle a la persona lo que se movió, se achicó o se dejó afuera: la página lo muestra junto a los avisos del análisis. */
  warn?: (message: string) => void
}

/** Madera clara de la biblioteca de Pascal (roble claro: «Madera fina 2»). */
export const FLOOR_MATERIAL = 'wood-woodfine2'

const WALL_INSIDE = 'preset-softwhite'
const WALL_OUTSIDE = 'concrete-stucco'
const CEILING = 'concrete-plaster'

const KIND_NAMES = { door: 'Puerta', window: 'Ventana' } as const

/**
 * La posición de una abertura a lo largo del muro de la definición. Gemini la mide desde la esquina izquierda mirando el muro desde dentro; los
 * muros de `perimeter` van de oeste a este (norte y sur) y de norte a sur (este y oeste), así que en el sur y el oeste se mide desde el otro extremo.
 */
const alongWall = (opening: PlacedOpening, room: { width: number; depth: number }): number =>
  Math.round({ n: opening.at, e: opening.at, s: room.width - opening.at, w: room.depth - opening.at }[opening.wall] * 1000) / 1000

function openingDefs(openings: readonly PlacedOpening[], room: { width: number; depth: number }): OpeningDef[] {
  const total = { door: 0, window: 0 }
  for (const opening of openings) total[opening.type]++
  const seen = { door: 0, window: 0 }
  return openings.map((opening) => {
    const n = ++seen[opening.type]
    const id = `${opening.type === 'door' ? 'puerta' : 'ventana'}-${n}`
    const name = total[opening.type] > 1 ? `${KIND_NAMES[opening.type]} ${n}` : KIND_NAMES[opening.type]
    return { id, type: opening.type, wall: `p-${opening.wall}`, at: alongWall(opening, room), width: opening.width, name }
  })
}

/**
 * Convierte el plano de una foto en la definición de un ambiente (un `TemplateDefinition` de un nivel). `resolve` es el catálogo local:
 * devuelve la pieza de un `asset_id` (con su tamaño real) o `undefined` si no la tiene (esa pieza se descarta con aviso, nunca se sustituye).
 */
export function analysisToDefinition<T extends AnalysisAssetLike>(
  analysis: RoomAnalysis,
  resolve: (assetId: string) => T | undefined,
  opts: AnalysisToDefinitionOptions = {},
): TemplateDefinition {
  const plan = solveLayout(analysis, resolve)
  for (const message of plan.warnings) opts.warn?.(message)
  const { width, depth } = plan.room

  const items: ItemDef[] = plan.pieces.map((piece) => ({
    asset: piece.asset.id,
    at: [piece.x, piece.z],
    rotY: piece.rotY,
    ...(piece.y > 0 ? { y: piece.y } : {}),
  }))

  return {
    id: 'foto',
    kind: 'vivienda',
    name: 'Escena desde una foto',
    summary: 'Un ambiente con el plano que armamos de tu foto: sus puertas, ventanas, piso de madera clara y los muebles que reconocimos.',
    levels: [
      {
        id: 'pb',
        wallInside: WALL_INSIDE,
        wallOutside: WALL_OUTSIDE,
        trim: true,
        walls: perimeter('p', 0, 0, width, depth).map((wall) => ({ ...wall, name: `Muro ${WALL_NAMES[wall.id.slice(-1) as WallSide]}` })),
        rooms: [{ id: 'ambiente', name: 'Ambiente', color: '#1F5FE0', rect: [0, 0, width, depth], floor: FLOOR_MATERIAL, ceiling: CEILING }],
        openings: openingDefs(plan.openings, plan.room),
        items,
      },
    ],
  }
}
