/**
 * Corta `text` con "…" para que `widthOf` (la medida real en la fuente) no pase de `maxWidth`. Normaliza los espacios, no parte
 * caracteres de dos unidades (emoji) y no deja un espacio antes de los puntos suspensivos. Vacío si ni "…" cabe.
 */
export function fitText(text: string, maxWidth: number, widthOf: (text: string) => number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (widthOf(clean) <= maxWidth) return clean
  const chars = Array.from(clean)
  const cut = (count: number) => `${chars.slice(0, count).join('').trimEnd()}…`
  let low = 0
  let high = chars.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (widthOf(cut(mid)) <= maxWidth) low = mid
    else high = mid - 1
  }
  if (low === 0) return widthOf('…') <= maxWidth ? '…' : ''
  return cut(low)
}
