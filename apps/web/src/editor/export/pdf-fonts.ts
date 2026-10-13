import { FONT_FILES, type FontKey } from '@/lib/export/font-files'

export type PdfFontBytes = Record<FontKey, ArrayBuffer>

let cached: Promise<PdfFontBytes> | null = null

async function download(fetcher: typeof fetch): Promise<PdfFontBytes> {
  const entries = await Promise.all(
    (Object.entries(FONT_FILES) as [FontKey, string][]).map(async ([key, url]) => {
      const response = await fetcher(url)
      if (!response.ok) throw new Error(`No se pudo cargar la fuente ${url} (${response.status})`)
      return [key, await response.arrayBuffer()] as const
    }),
  )
  return Object.fromEntries(entries) as PdfFontBytes
}

/** Las cuatro variantes de DM Sans, descargadas una sola vez. Si la descarga falla, la próxima llamada vuelve a intentar. */
export function loadPdfFonts(fetcher: typeof fetch = fetch): Promise<PdfFontBytes> {
  cached ??= download(fetcher).catch((error) => {
    cached = null
    throw error
  })
  return cached
}
