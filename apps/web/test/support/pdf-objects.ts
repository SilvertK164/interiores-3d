import { inflateSync } from 'node:zlib'

/**
 * Los objetos de un PDF de `pdfkit`, leídos sin agregar `pdfjs-dist` al proyecto. Un flujo (`stream`) se corta por su `/Length`
 * (el binario de una fuente o de una imagen puede traer cualquier secuencia de bytes, hasta "endobj") y solo se descomprime
 * cuando alguien pide `data()`: las imágenes y las fuentes no se tocan si no hacen falta.
 */
export type PdfObject = { dict: string; data(): string | null }

/** `latin1` conserva un byte por carácter: sirve para buscar texto en el binario sin perder nada. */
export const asLatin1 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('latin1')

export function parseObjects(bytes: Uint8Array): Map<number, PdfObject> {
  const raw = asLatin1(bytes)
  const objects = new Map<number, PdfObject>()
  const header = /(?:^|[\r\n])(\d+) 0 obj\b/g
  for (let match = header.exec(raw); match; match = header.exec(raw)) {
    const id = Number(match[1])
    const bodyStart = match.index + match[0].length
    const streamAt = raw.indexOf('stream', bodyStart)
    const endAt = raw.indexOf('endobj', bodyStart)
    if (streamAt < 0 || (endAt >= 0 && endAt < streamAt)) {
      objects.set(id, { dict: raw.slice(bodyStart, endAt < 0 ? raw.length : endAt), data: () => null })
      header.lastIndex = endAt < 0 ? raw.length : endAt
      continue
    }
    const dict = raw.slice(bodyStart, streamAt)
    const dataStart = streamAt + 6 + (raw.startsWith('\r\n', streamAt + 6) ? 2 : 1)
    const length = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict)
    const dataEnd = length ? dataStart + Number(length[1]) : raw.indexOf('endstream', dataStart)
    objects.set(id, {
      dict,
      data: () => {
        const data = raw.slice(dataStart, dataEnd)
        return /\/FlateDecode/.test(dict) ? inflateSync(Buffer.from(data, 'latin1')).toString('latin1') : data
      },
    })
    header.lastIndex = dataEnd
  }
  return objects
}

/** El número del objeto al que apunta `/Clave N 0 R` dentro de un diccionario. */
export function refOf(dict: string, key: string): number | null {
  const found = new RegExp(String.raw`/${key}\s+(\d+) 0 R`).exec(dict)
  return found ? Number(found[1]) : null
}

/** Las páginas del documento, con su caja, su contenido y sus recursos. */
export function pagesOf(objects: Map<number, PdfObject>): { dict: string; content: string; resources: string }[] {
  const pages: { dict: string; content: string; resources: string }[] = []
  // El orden de las páginas es el de `/Kids` del árbol de páginas (el de los objetos en el archivo suele coincidir, pero no se promete).
  const kids = [...objects.values()].map((object) => /\/Type\s*\/Pages\b[\s\S]*?\/Kids\s*\[([^\]]*)\]/.exec(object.dict)).find(Boolean)
  const ordered = kids ? [...(kids[1] ?? '').matchAll(/(\d+) 0 R/g)].map((match) => objects.get(Number(match[1]))) : [...objects.values()]
  for (const object of ordered) {
    const dict = object?.dict ?? ''
    if (!/\/Type\s*\/Page\b(?!s)/.test(dict)) continue
    const contents = refOf(dict, 'Contents')
    const resources = refOf(dict, 'Resources')
    pages.push({
      dict,
      content: contents ? (objects.get(contents)?.data() ?? '') : '',
      resources: resources ? (objects.get(resources)?.dict ?? '') : dict,
    })
  }
  return pages
}
