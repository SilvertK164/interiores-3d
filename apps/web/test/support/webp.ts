/**
 * ¿El WebP declara canal alfa? Lee solo la cabecera del primer trozo, sin decodificar la imagen:
 * `VP8X` (formato extendido) trae la bandera de alfa en el bit 4 del byte 20; `VP8L` (sin pérdida) trae el bit
 * `alpha_is_used` (el bit 28 de los 32 que siguen a la firma 0x2f); `VP8 ` (con pérdida simple) nunca trae alfa.
 */
export function webpHasAlpha(bytes: Uint8Array): boolean {
  const text = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length))
  if (bytes.length < 21 || text(0, 4) !== 'RIFF' || text(8, 4) !== 'WEBP') throw new Error('No es un WebP')
  const chunk = text(12, 4)
  if (chunk === 'VP8X') return ((bytes[20] ?? 0) & 0x10) !== 0
  if (chunk === 'VP8L') return bytes[20] === 0x2f && ((bytes[24] ?? 0) & 0x10) !== 0
  if (chunk === 'VP8 ') return false
  throw new Error(`Trozo WebP desconocido: ${chunk}`)
}
