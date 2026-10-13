import { ANALYZE_IMAGE_MAX_BYTES } from '@interiores/contract'

/** Lado mayor de la foto que se envía al análisis: con más píxeles no reconoce mejor y la petición pesa de más. */
export const PHOTO_MAX_SIDE = 1600
/** Calidad del JPEG que se envía (0 a 1). */
export const PHOTO_JPEG_QUALITY = 0.85
/** Una foto más pesada que esto ni se intenta abrir (el navegador podría quedarse sin memoria). */
export const PHOTO_INPUT_MAX_BYTES = 30 * 1024 * 1024

/** Un problema con la foto (no se abre, no se puede preparar, pesa de más): su mensaje ya está escrito para personas. */
export class PhotoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PhotoError'
  }
}

/** La foto lista para enviar: un JPEG en base64 (sin el prefijo `data:`). */
export type ReducedPhoto = { image: string; mime: 'image/jpeg' }

/** Mide `width` × `height` con el lado mayor en `maxSide` como mucho, sin deformarla y sin agrandar una foto que ya cabe. */
export function fitWithin(width: number, height: number, maxSide: number = PHOTO_MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (!(longest > maxSide)) return { width, height }
  const scale = maxSide / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Base64 estándar con relleno (el mismo que escribe `Buffer.toString('base64')`), por trozos para no desbordar la pila. */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(binary)
}

/** Una foto ya abierta por el navegador. `source` es lo que el códec sabe dibujar; `release` libera su memoria. */
export type DecodedPhoto = { width: number; height: number; source: unknown; release(): void }

/** Lo único que depende del navegador (decodificar y dibujar en un canvas): se cambia en las pruebas. */
export type PhotoCodec = {
  /** Abre la foto con su orientación ya aplicada (la que guarda el celular en EXIF). */
  decode(file: Blob): Promise<DecodedPhoto>
  /** La foto a ese tamaño como JPEG de calidad `PHOTO_JPEG_QUALITY`, sobre fondo blanco. */
  encode(photo: DecodedPhoto, size: { width: number; height: number }): Promise<Blob>
}

/** El códec real: `createImageBitmap` y un canvas. Lo cubren los e2e, que corren en un navegador de verdad. */
export const browserPhotoCodec: PhotoCodec = {
  async decode(file) {
    const bitmap = await createImageBitmap(file)
    return { width: bitmap.width, height: bitmap.height, source: bitmap, release: () => bitmap.close() }
  },
  async encode(photo, size) {
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('sin canvas')
    // El JPEG no tiene transparencia: un PNG con fondo transparente quedaría negro.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, size.width, size.height)
    context.imageSmoothingQuality = 'high'
    context.drawImage(photo.source as ImageBitmap, 0, 0, size.width, size.height)
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('sin JPEG'))), 'image/jpeg', PHOTO_JPEG_QUALITY)
    })
  },
}

const MB = 1024 * 1024

/**
 * Prepara la foto para el análisis: la abre, la reduce (lado mayor ≤ 1600 px), la guarda como JPEG de calidad 0,85 y la deja en
 * base64. Así lo que viaja pesa cientos de KB y no los MB de una foto de celular, y siempre es un formato que la API entiende.
 * Cualquier problema sale como `PhotoError`, con el mensaje listo para mostrar.
 */
export async function reducePhoto(file: Blob, codec: PhotoCodec = browserPhotoCodec): Promise<ReducedPhoto> {
  if (file.size > PHOTO_INPUT_MAX_BYTES) throw new PhotoError(`La foto pesa más de ${PHOTO_INPUT_MAX_BYTES / MB} MB. Prueba con una más liviana.`)
  let decoded: DecodedPhoto
  try {
    decoded = await codec.decode(file)
  } catch {
    throw new PhotoError('No pudimos abrir la foto. Prueba con otra imagen en formato JPG, PNG o WebP.')
  }
  try {
    let jpeg: Blob
    try {
      jpeg = await codec.encode(decoded, fitWithin(decoded.width, decoded.height))
    } catch {
      throw new PhotoError('No pudimos preparar la foto para enviarla. Prueba con otra imagen.')
    }
    if (jpeg.size > ANALYZE_IMAGE_MAX_BYTES) {
      throw new PhotoError(`La foto sigue siendo demasiado grande (más de ${ANALYZE_IMAGE_MAX_BYTES / MB} MB) aun reducida. Prueba con otra.`)
    }
    return { image: bytesToBase64(new Uint8Array(await jpeg.arrayBuffer())), mime: 'image/jpeg' }
  } finally {
    decoded.release()
  }
}
