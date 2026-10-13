import { sceneCenter } from '../templates/geometry'
import type { LevelDef, TemplateDefinition } from '../templates/types'
import { round3 } from './layout-geometry'
import type { Room } from './layout-types'
import { CAMERA_FOV_DEFAULT_DEG, type PhotoCamera } from './schema'

/**
 * El punto de vista de la foto: al abrir el proyecto de «Escena desde una foto», la cámara 3D se ubica donde estaba quien la sacó (la posición
 * `camera` del plano que armó el análisis: dentro del ambiente, en una esquina o apenas afuera de un muro), a la altura de los ojos y mirando
 * hacia el punto del plano al que apuntaba el centro de la foto. Es pura (sin Pascal ni DOM): da la pose en coordenadas del ambiente y
 * `photo-camera-handoff.ts` la lleva hasta el editor.
 *
 * Las coordenadas son las del plano (esquina noroeste en 0, 0; +x al este y +z al sur): una cámara que mira al norte desde el muro sur ve
 * el este a su derecha, como en la foto.
 */

/** Un punto en metros: `[x, y (hacia arriba), z]`. */
export type Vec3 = [number, number, number]
/** Una cámara 3D: dónde está (`position`), hacia dónde mira (`target`) y su campo de visión vertical en grados (`fov`). */
export type CameraPose = { position: Vec3; target: Vec3; fov: number }

/** Altura de los ojos de quien sacó la foto, sobre el piso. */
export const EYE_HEIGHT_M = 1.5
/**
 * Altura del punto al que mira: bien por debajo de los ojos, así la cámara mira hacia abajo y entran el piso y los muebles del centro
 * (a 1 m y con 50° de campo de visión solo se veía el muro del fondo).
 */
export const TARGET_HEIGHT_M = 0.7
/**
 * Cuánto se separa la cámara del eje de un muro: medio muro (0,1 m) y 0,2 m más, para quedar adentro y no sobre su cara. Una cámara pegada a
 * un muro o apenas afuera de él se corre hasta ahí: de otro modo el muro quedaría delante de la lente y taparía la vista.
 */
export const NEAR_WALL_GAP_M = 0.3
/**
 * Los controles de Pascal no dejan acercar la cámara a menos de 2 m de su punto de mira (`minDistance` de `custom-camera-controls.tsx`).
 * `setLookAt` acepta una pose más corta, pero el primer giro de la rueda la mandaría de golpe a 2 m: hacia atrás y fuera del muro
 * cercano, que taparía la vista. Con 10 cm de holgura.
 */
export const MIN_VIEW_DISTANCE_M = 2.1
/**
 * Tampoco dejan bajar la cámara de 0,1 rad sobre el horizonte (`maxPolarAngle`): con los ojos 0,8 m sobre el punto de mira, el punto
 * más lejano que admite está a unos 8 m; en una pose más lejana, el primer arrastre la subiría de golpe. Se queda mucho antes: en un
 * ambiente enorme, un punto de mira a más de 4,5 m ya no es lo que se ve.
 */
export const MAX_VIEW_REACH_M = 4.5

const DROP_M = EYE_HEIGHT_M - TARGET_HEIGHT_M
/** Lo mínimo que se adelanta el punto de mira (en el plano) para llegar a `MIN_VIEW_DISTANCE_M`. */
const MIN_REACH_M = Math.sqrt(MIN_VIEW_DISTANCE_M ** 2 - DROP_M ** 2)

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/**
 * La cámara de la foto en coordenadas del ambiente (metros desde su esquina 0, 0): en la posición del plano, corrida adentro si estaba
 * pegada a un muro o afuera (a `NEAR_WALL_GAP_M` del eje del muro), a `EYE_HEIGHT_M` de altura y mirando hacia `look_at`. El objetivo va
 * sobre esa línea, a `TARGET_HEIGHT_M` de altura y a la distancia del punto de mira siempre que quede dentro de lo que admiten los
 * controles de Pascal (a 2 m o más de la cámara y no más de `MAX_VIEW_REACH_M` en el plano): más cerca pasa de largo y más lejos se acerca.
 * El campo de visión es el de la foto, o 60° si el análisis no lo dio.
 */
export function photoCameraPose(room: Room, camera: PhotoCamera): CameraPose {
  const x = clamp(camera.x_m, NEAR_WALL_GAP_M, Math.max(NEAR_WALL_GAP_M, room.width - NEAR_WALL_GAP_M))
  const z = clamp(camera.z_m, NEAR_WALL_GAP_M, Math.max(NEAR_WALL_GAP_M, room.depth - NEAR_WALL_GAP_M))
  let dx = camera.look_at.x_m - x
  let dz = camera.look_at.z_m - z
  if (Math.hypot(dx, dz) < 1e-6) {
    // El corte dejó la cámara justo sobre el punto de mira: se mantiene el sentido que tenía desde donde estaba (y, si no, hacia el norte).
    dx = camera.look_at.x_m - camera.x_m
    dz = camera.look_at.z_m - camera.z_m
    if (Math.hypot(dx, dz) < 1e-6) [dx, dz] = [0, -1]
  }
  const distance = Math.hypot(dx, dz)
  const reach = clamp(distance, MIN_REACH_M, MAX_VIEW_REACH_M)
  return {
    position: [round3(x), EYE_HEIGHT_M, round3(z)],
    target: [round3(x + (dx / distance) * reach), TARGET_HEIGHT_M, round3(z + (dz / distance) * reach)],
    fov: camera.fov_deg ?? CAMERA_FOV_DEFAULT_DEG,
  }
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
  const place = ([x, y, z]: Vec3): Vec3 => [round3(x - centerX), round3(y + FLOOR_TOP_M), round3(z - centerZ)]
  return { position: place(pose.position), target: place(pose.target), fov: pose.fov }
}

/**
 * La cámara de la foto lista para el editor: la de `camera` (la posición y el punto de mira del plano) en las coordenadas de la escena de
 * `definition`. El ambiente es el de su primer ambiente (`rooms[0].rect`, que `analysisToDefinition` arma con las medidas del plano): así
 * la cámara y la escena hablan siempre del mismo rectángulo.
 */
export function photoSceneCamera(camera: PhotoCamera, definition: TemplateDefinition): CameraPose {
  const [x0, z0, x1, z1] = (definition.levels[0] as LevelDef).rooms[0]?.rect ?? [0, 0, 0, 0]
  return sceneCameraPose(photoCameraPose({ width: x1 - x0, depth: z1 - z0 }, camera), definition)
}
