export type Vec3 = readonly [number, number, number]

/** Lado, en píxeles, de cada miniatura: la tarjeta del catálogo la muestra a unos 100 px y el doble da nitidez en pantallas densas. */
export const THUMBNAIL_SIZE = 256
/** Campo de visión vertical de la cámara de captura, en grados. */
export const THUMBNAIL_FOV = 30

const unit = (v: Vec3): Vec3 => {
  const n = Math.hypot(v[0], v[1], v[2])
  return [v[0] / n, v[1] / n, v[2] / n]
}

/** Desde dónde se fotografía: de frente, algo hacia la derecha y desde arriba (la vista clásica de catálogo). */
export const VIEW_DIRECTION: Vec3 = unit([0.55, 0.42, 0.72])

/**
 * Dónde poner la cámara para que una esfera de `radius` metros centrada en `center` entre entera en el cuadro, con
 * un 12 % de aire (`margin`). Los planos cercano y lejano se ajustan al tamaño para no recortar ni perder precisión.
 */
export function framePlacement(
  center: Vec3,
  radius: number,
  fovDegrees: number,
  margin = 1.12,
): { position: Vec3; near: number; far: number } {
  const distance = (radius / Math.sin((fovDegrees * Math.PI) / 360)) * margin
  return {
    position: [
      center[0] + VIEW_DIRECTION[0] * distance,
      center[1] + VIEW_DIRECTION[1] * distance,
      center[2] + VIEW_DIRECTION[2] * distance,
    ],
    near: (distance - radius) / 2,
    far: (distance + radius) * 2,
  }
}
