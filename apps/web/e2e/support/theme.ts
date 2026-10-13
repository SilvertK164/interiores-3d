const channel = (value: number) => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (r: number, g: number, b: number) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const alphaOf = (raw: string | undefined) => (raw === undefined ? 1 : raw.endsWith('%') ? Number.parseFloat(raw) / 100 : Number.parseFloat(raw))

/**
 * Luminancia relativa (0 = negro, 1 = blanco) de un color CSS. Lo translúcido se mezcla con negro: es el peor caso para
 * afirmar "este fondo no es oscuro". `null` si el color es del todo transparente o no se entiende.
 */
export function luminanceOf(css: string): number | null {
  const text = css.trim().toLowerCase()
  const hex = /^#([0-9a-f]{6})$/.exec(text)
  if (hex) {
    const n = Number.parseInt(hex[1] ?? '', 16)
    return luminance((n >> 16) & 255, (n >> 8) & 255, n & 255)
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(text)
  if (rgb) {
    const alpha = alphaOf(rgb[4])
    if (alpha === 0) return null
    return luminance(Number(rgb[1]) * alpha, Number(rgb[2]) * alpha, Number(rgb[3]) * alpha)
  }
  const srgb = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(text)
  if (srgb) {
    const alpha = alphaOf(srgb[4])
    if (alpha === 0) return null
    return luminance(Number(srgb[1]) * 255 * alpha, Number(srgb[2]) * 255 * alpha, Number(srgb[3]) * 255 * alpha)
  }
  const ok = /^ok(?:lab|lch)\(\s*([\d.]+%?)[^/)]*(?:\/\s*([\d.]+%?))?\s*\)$/.exec(text)
  if (ok) {
    const alpha = alphaOf(ok[2])
    if (alpha === 0) return null
    const lightness = alphaOf(ok[1])
    return lightness ** 3 * alpha
  }
  return null
}

/** Relación de contraste WCAG entre dos colores (1 a 21); `null` si alguno no se entiende. */
export function contrastRatio(a: string, b: string): number | null {
  const la = luminanceOf(a)
  const lb = luminanceOf(b)
  if (la === null || lb === null) return null
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
