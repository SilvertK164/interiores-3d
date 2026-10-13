import { crc32, deflateSync } from 'node:zlib'
import type { Route } from '@playwright/test'

// TP3 vive en otro puerto (y en otro repositorio): las pruebas lo simulan con page.route, así que no necesitan
// el servicio, ni clave de Gemini, ni cuota. Un pedido con FormData es "simple": basta con la cabecera de CORS en la respuesta.
export const CORS = { 'access-control-allow-origin': '*' }

/** PNG de 2 × 2 píxeles armado a mano: lo mínimo para tener una foto válida sin guardar archivos binarios en el repo. */
export function tinyPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(2, 0) // ancho
  header.writeUInt32BE(2, 4) // alto
  header[8] = 8 // bits por canal
  header[9] = 2 // color verdadero (RGB)
  const row = Buffer.from([0, 200, 180, 150, 200, 180, 150]) // filtro 0 + dos píxeles
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat([row, row]))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export const answerWith = (analysis: unknown) => (route: Route) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(analysis) })
