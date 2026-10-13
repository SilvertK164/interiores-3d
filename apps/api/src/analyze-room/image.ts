import { ANALYZE_IMAGE_MAX_BYTES, type AnalyzeMime } from '@interiores/contract'
import { errors } from '../errors.js'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Los primeros bytes de cada formato («magia» del archivo): el de WebP es un RIFF cuyo tipo es WEBP. */
const MATCHES: Record<AnalyzeMime, (bytes: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length >= PNG_SIGNATURE.length && b.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
  'image/webp': (b) => b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP',
}

/**
 * Los bytes de la foto, o el error en castellano: 422 si no es base64, está vacía o su contenido no es el formato que dice
 * (nadie confía en el `mime` que manda quien llama), 413 si pasa de 3 MiB decodificada. `Buffer.from(…, 'base64')` es
 * indulgente (se salta lo que no es base64), por eso solo se acepta el base64 canónico, el que escribe `btoa`.
 */
export function decodeImage(image: string, mime: AnalyzeMime): Buffer {
  const bytes = Buffer.from(image, 'base64')
  if (bytes.length === 0 || bytes.toString('base64') !== image) throw errors.unreadableImage()
  if (bytes.length > ANALYZE_IMAGE_MAX_BYTES) throw errors.imageTooLarge()
  if (!MATCHES[mime](bytes)) throw errors.unreadableImage()
  return bytes
}
