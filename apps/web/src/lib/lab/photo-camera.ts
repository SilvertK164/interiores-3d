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
 * Los controles de Pascal no dejan acercar la cámara a menos de 2 m de su punto de mira (`minDistance` de `custom-camera-controls.tsx`):
 * una pose más corta se corrige sola y, en un ambiente chico, la sacaría del otro lado del muro cercano (que la taparía). Con 10 cm de holgura.
 */
export const MIN_VIEW_DISTANCE_M = 2.1
/**
 * Tampoco dejan bajar la cámara de 0,1 rad sobre el horizonte (`maxPolarAngle`): con los ojos 0,5 m sobre el punto de mira, el punto
 * más lejano que admite está a unos 5 m. Se queda un poco antes para que la pose sea siempre alcanzable.
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
 * siempre que Pascal pueda llevar la cámara hasta ahí (a 2 m o más de él y no a más de ~5): en un ambiente chico pasa de largo
 * (hacia el muro opuesto) y en uno muy grande se queda más cerca de la cámara.
 */
export function photoCameraPose(room: Room): CameraPose {
  const x = room.width / 2
  const z = room.depth - NEAR_WALL_GAP_M
  const reach = Math.min(Math.max(z - room.depth / 2, MIN_REACH_M), MAX_VIEW_REACH_M)
  return { position: [mm(x), EYE_HEIGHT_M, mm(z)], target: [mm(x), TARGET_HEIGHT_M, mm(z - reach)] }
}
