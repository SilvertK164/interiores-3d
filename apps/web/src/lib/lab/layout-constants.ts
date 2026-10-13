import type { WallSide } from './schema'

/**
 * Las medidas con las que el acomodador (`layout-solver.ts`) corrige el plano de Gemini. Todo en metros y grados. El ambiente es el
 * rectángulo `[0, ancho] × [0, fondo]` y sus muros (de 0,2 m) van centrados en sus bordes: la cara interior queda 0,1 m adentro.
 */

/** Del borde del rectángulo a la cara interior del muro: medio muro. */
export const WALL_FACE_M = 0.1
/** Holgura entre una pieza y la cara del muro (se pega «con 0,05 m»). */
export const WALL_GAP_M = 0.05
/** Distancia mínima entre el borde de una pieza y el borde del rectángulo del ambiente. */
export const EDGE_M = WALL_FACE_M + WALL_GAP_M

/** Por debajo de esta confianza el análisis no está seguro de que la pieza esté en la foto: se descarta (con aviso). */
export const MIN_CONFIDENCE = 0.3
/** Un movimiento menor que esto no se avisa: la posición que da una foto no es tan precisa. */
export const NOTICE_M = 0.25
/** Una pieza con el centro a más de esto fuera del rectángulo no se corrige: se saca. */
export const OUTSIDE_M = 0.25
/** Dos piezas que se pisan menos que esto en un eje no se consideran solapadas. */
export const OVERLAP_TOLERANCE_M = 0.03
/** Aire que queda entre dos piezas que se separaron. */
export const SEPARATION_GAP_M = 0.01

/** Un giro a menos de esto de un ángulo recto se endereza (los muebles de una casa están a escuadra). */
export const SNAP_DEG = 10
/** Un asiento que mira a menos de esto de su foco se deja como lo dio Gemini. */
export const SEAT_COHERENT_DEG = 45
/** Al girar un asiento hacia su foco, a menos de esto de un ángulo recto se endereza; más torcido se respeta. */
export const SEAT_SNAP_DEG = 25

/** No se apoya nada sobre una pieza más alta que esto (una biblioteca, un armario). */
export const MAX_SUPPORT_M = 1.4

/** Lo que se deja libre delante de una puerta, desde la cara del muro. */
export const DOOR_CLEAR_M = 0.9
/** Lo que se despeja delante de una ventana (solo de piezas altas y anchas, que la taparían). */
export const WINDOW_CLEAR_M = 0.3
/** El antepecho de una ventana mide 0,9 m: una pieza más alta que esto (con 5 cm de holgura) la tapa. */
export const WINDOW_COVER_HEIGHT_M = 0.95
/** Y para tapar algo de una ventana tiene que ser ancha a lo largo del muro. */
export const WINDOW_COVER_WIDTH_M = 0.9
/** Aire a cada lado de una puerta o ventana al despejar su zona. */
export const ZONE_AIR_M = 0.05

/** Una abertura se separa al menos esto de cada esquina de su muro (el validador de plantillas pide 0,1; con muros de 0,2 m se ve mejor con 0,3). */
export const OPENING_MARGIN_M = 0.3
/** Una abertura más angosta que esto no tiene sentido. */
export const OPENING_MIN_M = 0.4
/** Aire entre dos aberturas del mismo muro. */
export const OPENING_AIR_M = 0.05

/** Hacia dónde mira (`facing_deg`) una pieza pegada a cada muro: hacia el interior del ambiente. */
export const INTERIOR_FACING: Readonly<Record<WallSide, number>> = { n: 0, s: 180, e: 90, w: 270 }

export const WALL_NAMES: Readonly<Record<WallSide, string>> = { n: 'norte', s: 'sur', e: 'este', w: 'oeste' }
