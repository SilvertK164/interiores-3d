export type Face = 'latin' | 'ext'
export type Run = { face: Face; text: string }

type Range = readonly [number, number]

/** `unicode-range` de los archivos `latin` y `latin-ext` de DM Sans (los de Google Fonts, que copia @fontsource). */
const LATIN: readonly Range[] = [
  [0x0000, 0x00ff], [0x0131, 0x0131], [0x0152, 0x0153], [0x02bb, 0x02bc], [0x02c6, 0x02c6], [0x02da, 0x02da],
  [0x02dc, 0x02dc], [0x0304, 0x0304], [0x0308, 0x0308], [0x0329, 0x0329], [0x2000, 0x206f], [0x20ac, 0x20ac],
  [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215], [0xfeff, 0xfeff],
  [0xfffd, 0xfffd],
]
const EXT: readonly Range[] = [
  [0x0100, 0x02ba], [0x02bd, 0x02c5], [0x02c7, 0x02cc], [0x02ce, 0x02d7], [0x02dd, 0x02ff], [0x0304, 0x0304],
  [0x0308, 0x0308], [0x0329, 0x0329], [0x1d00, 0x1dbf], [0x1e00, 0x1e9f], [0x1ef2, 0x1eff], [0x2020, 0x2020],
  [0x20a0, 0x20ab], [0x20ad, 0x20c0], [0x2113, 0x2113], [0x2c60, 0x2c7f], [0xa720, 0xa7ff],
]

const inRanges = (ranges: readonly Range[], codePoint: number) => ranges.some(([low, high]) => codePoint >= low && codePoint <= high)

/** Qué archivo de DM Sans trae ese carácter, o `null` si ninguno (controles, emoji, escrituras no latinas). */
export function faceFor(codePoint: number): Face | null {
  if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint < 0xa0)) return null
  if (inRanges(LATIN, codePoint)) return 'latin'
  if (inRanges(EXT, codePoint)) return 'ext'
  return null
}

/**
 * Reparte un texto en tramos de una sola fuente cada uno. Lo que ninguna fuente permitida tiene sale como "?" (mejor que
 * un cuadro vacío). `faces` limita las fuentes disponibles: con `['latin']` (respaldo Helvetica) lo extendido sale "?".
 */
export function splitRuns(text: string, faces: readonly Face[] = ['latin', 'ext']): Run[] {
  const runs: Run[] = []
  for (const char of text) {
    let face = faceFor(char.codePointAt(0) ?? 0)
    let value = char
    if (face === null || !faces.includes(face)) {
      face = 'latin'
      value = '?'
    }
    const last = runs.at(-1)
    if (last && last.face === face) last.text += value
    else runs.push({ face, text: value })
  }
  return runs
}
