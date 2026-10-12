import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { PdfFontBytes } from '../../src/editor/export/pdf-fonts'
import { FONT_FILES, type FontKey } from '../../src/lib/export/font-files'

export function fontBytes(): PdfFontBytes {
  const entries = (Object.entries(FONT_FILES) as [FontKey, string][]).map(([key, url]) => {
    const file = readFileSync(fileURLToPath(new URL(`../../public${url}`, import.meta.url)))
    return [key, file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)] as const
  })
  return Object.fromEntries(entries) as PdfFontBytes
}
