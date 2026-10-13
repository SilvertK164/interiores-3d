import { sceneCenter } from '../templates/geometry'
import type { LevelDef, TemplateDefinition } from '../templates/types'
import type { Room } from './analysis-to-definition'

/**
 * El punto de vista de la foto: al abrir el proyecto de «Escena desde una foto», la cámara 3D se ubica donde estaba quien la sacó,
 * del lado del muro cercano y mirando hacia el opuesto. Es pura (sin Pascal ni DOM): da la pose en coordenadas del ambiente y
 * `photo-camera-handoff.ts` la lleva hasta el editor.
 *
 * La convención del análisis: `y = 1` es lo más cercano a la cámara de la foto y `y = 0` lo más lejano; `x = 0` es la izquierda y
 * `x = 1` la derecha. En el ambiente (esquina en 0, 0; +x a la derecha y +z hacia quien mira, como el plano de Pascal) la cámara va por
 * eso en el muro de `z = depth`, centrada en x, y mira hacia `z = 0`: así +x queda a la derecha de la imagen.
 */

/** Un punto en metros: `[x, y (hacia arriba), z]`. */
export type Vec3 = [number, number, number]
/** Una cámara 3D: dónde está (`position`) y hacia dónde mira (`target`). */
export type CameraPose = { position: Vec3; target: Vec3 }

/** Altura de los ojos de quien sacó la foto, sobre el piso. */
export const EYE_HEIGHT_M = 1.5
/** Altura del punto al que mira: un poco por debajo de los ojos, así la imagen baja apenas y entra el piso. */
export const TARGET_HEIGHT_M = 1
/** Cuánto se separa la cámara del eje del muro cercano: medio muro (0,1 m) y 0,2 m más, para quedar adentro y no sobre su cara. */
export const NEAR_WALL_GAP_M = 0.3
/**
 * Los controles de Pascal no dejan acercar la cámara a menos de 2 m de su punto de mira (`minDistance` de `custom-camera-controls.tsx`).
 * `setLookAt` acepta una pose más corta, pero el primer giro de la rueda la mandaría de golpe a 2 m: hacia atrás y fuera del muro
 * cercano, que taparía la vista. Con 10 cm de holgura.
 */
export const MIN_VIEW_DISTANCE_M = 2.1
/**
 * Tampoco dejan bajar la cámara de 0,1 rad sobre el horizonte (`maxPolarAngle`): con los ojos 0,5 m sobre el punto de mira, el punto
 * más lejano que admite está a unos 5 m; en una pose más lejana, el primer arrastre la subiría de golpe. Se queda un poco antes.
 */
export const MAX_VIEW_REACH_M = 4.5

const DROP_M = EYE_HEIGHT_M - TARGET_HEIGHT_M
/** Lo mínimo que se adelanta el punto de mira (en el plano) para llegar a `MIN_VIEW_DISTANCE_M`. */
const MIN_REACH_M = Math.sqrt(MIN_VIEW_DISTANCE_M ** 2 - DROP_M ** 2)

/** Al milímetro y nunca `-0`. */
const mm = (n: number) => Math.round(n * 1000) / 1000 + 0

/**
 * La cámara de la foto en coordenadas del ambiente (metros desde su esquina 0, 0): centrada en x, a `EYE_HEIGHT_M` de altura y
 * a `NEAR_WALL_GAP_M` del muro cercano, mirando de frente al muro opuesto, a `TARGET_HEIGHT_M`. El objetivo es el centro del ambiente
 * siempre que quede a la distancia que admiten los controles de Pascal (a 2 m o más de la cámara y no a más de ~5): en un ambiente
 * chico pasa de largo (hacia el muro opuesto) y en uno muy grande se queda más cerca de la cámara.
 */
export function photoCameraPose(room: Room): CameraPose {
  const x = room.width / 2
  const z = room.depth - NEAR_WALL_GAP_M
  const reach = Math.min(Math.max(z - room.depth / 2, MIN_REACH_M), MAX_VIEW_REACH_M)
  return { position: [mm(x), EYE_HEIGHT_M, mm(z)], target: [mm(x), TARGET_HEIGHT_M, mm(z - reach)] }
}

/** El piso terminado (la cara de arriba de la losa) está a 0,05 m del plano de la planta: `elevation` de `SlabNode` en `@pascal-app/core`. */
export const FLOOR_TOP_M = 0.05

/**
 * La misma cámara en las coordenadas de la escena de Pascal, que es lo que reciben sus controles. `buildScene` lleva el centro de los
 * muros de la primera planta al origen (`sceneCenter`), así que en x y en z se resta ese centro; y las alturas, que se miden sobre el
 * piso, se suben el espesor de la losa (`FLOOR_TOP_M`). La planta baja está en y = 0.
 */
export function sceneCameraPose(pose: CameraPose, definition: TemplateDefinition): CameraPose {
  const [centerX, centerZ] = sceneCenter(definition.levels[0] as LevelDef)
  const place = ([x, y, z]: Vec3): Vec3 => [mm(x - centerX), mm(y + FLOOR_TOP_M), mm(z - centerZ)]
  return { position: place(pose.position), target: place(pose.target) }
}
