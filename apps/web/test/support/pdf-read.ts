import { inflateSync } from 'node:zlib'

/**
 * Lector mínimo de los PDF que arma `pdfkit` (texto en `TJ`, fuentes Type0 con su `ToUnicode` o estándar), sin agregar
 * `pdfjs-dist` al proyecto: alcanza para comprobar tamaño de hoja, texto, tipos de letra, imágenes y colores. Entiende
 * los flujos con `FlateDecode`, así que sirve también para los PDF comprimidos que se descargan.
 */
export type PdfItem = { str: string; x: number; y: number; width: number; font: string; size: number }
export type PdfPage = { width: number; height: number; items: PdfItem[]; content: string }
type PdfObject = { dict: string; text: string | null }

/** `latin1` conserva un byte por carácter: sirve para buscar texto en el binario sin perder nada. */
export const asLatin1 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('latin1')

function parseObjects(raw: string): Map<number, PdfObject> {
  const objects = new Map<number, PdfObject>()
  for (const match of raw.matchAll(/(\d+) 0 obj\b([\s\S]*?)\bendobj/g)) {
    const body = match[2] ?? ''
    const start = body.indexOf('stream')
    if (start < 0 || !/^\s*<</.test(body)) {
      objects.set(Number(match[1]), { dict: body, text: null })
      continue
    }
    const dict = body.slice(0, start)
    let data = body.slice(start + 6).replace(/^\r?\n/, '')
    data = data.slice(0, data.lastIndexOf('endstream')).replace(/\r?\n$/, '')
    if (/\/FlateDecode/.test(dict)) data = inflateSync(Buffer.from(data, 'latin1')).toString('latin1')
    objects.set(Number(match[1]), { dict, text: data })
  }
  return objects
}

const refOf = (dict: string, key: string): number | null => {
  const found = new RegExp(String.raw`/${key}\s+(\d+) 0 R`).exec(dict)
  return found ? Number(found[1]) : null
}

/** Traduce los códigos (CID) de una fuente Type0 con su `ToUnicode` (`bfchar` y `bfrange`). */
function toUnicodeMap(cmap: string): Map<number, string> {
  const map = new Map<number, string>()
  const utf16 = (hex: string) => String.fromCharCode(...(hex.match(/.{4}/g) ?? []).map((h) => Number.parseInt(h, 16)))
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const [, code, target] of (block[1] ?? '').matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      map.set(Number.parseInt(code ?? '', 16), utf16(target ?? ''))
    }
  }
  // pdfkit escribe los rangos con una lista de destinos: `<0000> <0006> [<0000> <0048> …]` (un código por posición).
  const range = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([^\]]*)\])/g
  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const [, low, high, single, list] of (block[1] ?? '').matchAll(range)) {
      const first = Number.parseInt(low ?? '', 16)
      const last = Number.parseInt(high ?? '', 16)
      const targets = list ? [...list.matchAll(/<([0-9a-fA-F]+)>/g)].map((m) => utf16(m[1] ?? '')) : []
      for (let code = first; code <= last; code++) {
        map.set(code, single ? String.fromCharCode(Number.parseInt(single, 16) + code - first) : (targets[code - first] ?? ''))
      }
    }
  }
  return map
}

type Font = { decode(hex: string): { text: string; widths: number[] } }

function fontFor(objects: Map<number, PdfObject>, id: number): Font {
  const dict = objects.get(id)?.dict ?? ''
  const unicode = refOf(dict, 'ToUnicode')
  if (!unicode) {
    // Fuente estándar (WinAnsi ≈ Latin-1): un byte por carácter, sin anchos.
    return { decode: (hex) => ({ text: Buffer.from(hex, 'hex').toString('latin1'), widths: [] }) }
  }
  const map = toUnicodeMap(objects.get(unicode)?.text ?? '')
  const descendant = /\/DescendantFonts\s*\[\s*(\d+) 0 R/.exec(dict)
  const cid = descendant ? (objects.get(Number(descendant[1]))?.dict ?? '') : ''
  const widths = (/\/W\s*\[\s*0\s*\[([^\]]*)\]/.exec(cid)?.[1] ?? '').trim().split(/\s+/).filter(Boolean).map(Number)
  return {
    decode: (hex) => {
      const codes = (hex.match(/.{4}/g) ?? []).map((h) => Number.parseInt(h, 16))
      return { text: codes.map((code) => map.get(code) ?? '').join(''), widths: codes.map((code) => widths[code] ?? 0) }
    },
  }
}

function fontsOf(objects: Map<number, PdfObject>, resources: string): Map<string, Font> {
  const fonts = new Map<string, Font>()
  const direct = /\/Font\s*<<([^>]*)>>/.exec(resources)
  const viaRef = refOf(resources, 'Font')
  const table = direct?.[1] ?? (viaRef ? (objects.get(viaRef)?.dict ?? '') : '')
  for (const [, name, id] of table.matchAll(/\/(\w+)\s+(\d+) 0 R/g)) fonts.set(name ?? '', fontFor(objects, Number(id)))
  return fonts
}

function itemsOf(content: string, fonts: Map<string, Font>): PdfItem[] {
  const items: PdfItem[] = []
  let x = 0
  let y = 0
  let font = ''
  let size = 0
  for (const text of content.matchAll(/BT([\s\S]*?)ET/g)) {
    const block = text[1] ?? ''
    const matrix = /([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) Tm/.exec(block)
    if (matrix) {
      x = Number(matrix[5])
      y = Number(matrix[6])
    }
    const face = /\/(\w+) ([\d.]+) Tf/.exec(block)
    if (face) {
      font = face[1] ?? ''
      size = Number(face[2])
    }
    for (const show of block.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      let str = ''
      let advance = 0
      for (const part of (show[1] ?? '').matchAll(/<([0-9a-fA-F]*)>|(-?[\d.]+)/g)) {
        if (part[1] !== undefined) {
          const decoded = fonts.get(font)?.decode(part[1]) ?? { text: '', widths: [] }
          str += decoded.text
          advance += decoded.widths.reduce((total, w) => total + (w * size) / 1000, 0)
        } else advance -= (Number(part[2]) * size) / 1000
      }
      items.push({ str, x, y, width: advance, font, size })
    }
  }
  return items
}

export async function readPdf(bytes: Uint8Array): Promise<PdfPage[]> {
  const objects = parseObjects(asLatin1(bytes))
  const pages: PdfPage[] = []
  for (const { dict } of objects.values()) {
    if (!/\/Type\s*\/Page\b(?!s)/.test(dict)) continue
    const box = /\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/.exec(dict)
    const contents = refOf(dict, 'Contents')
    const resources = refOf(dict, 'Resources')
    const content = contents ? (objects.get(contents)?.text ?? '') : ''
    const fonts = fontsOf(objects, resources ? (objects.get(resources)?.dict ?? '') : dict)
    pages.push({
      width: Number(box?.[3] ?? 0) - Number(box?.[1] ?? 0),
      height: Number(box?.[4] ?? 0) - Number(box?.[2] ?? 0),
      items: itemsOf(content, fonts),
      content,
    })
  }
  return pages
}
