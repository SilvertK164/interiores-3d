import { crc32, deflateSync } from 'node:zlib'
import type { Page, Request, Route } from '@playwright/test'

// La API llama a Gemini desde el servidor. Las pruebas simulan la respuesta de POST /v1/analyze-room con page.route: no necesitan
// clave de Gemini, ni cuota, ni gastar los 10 análisis por hora de la cuenta de prueba. El pedido lleva JSON y Authorization, así
// que el navegador manda antes un OPTIONS (CORS) que atienden la API local o el propio Playwright; la respuesta simulada solo
// necesita la cabecera de CORS.
export const ANALYZE_URL = '**/v1/analyze-room'
export const CORS = { 'access-control-allow-origin': '*' }

const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** Un PNG RGB de ese tamaño a partir de sus filas ya armadas (cada una con su byte de filtro 0 al principio). */
function pngFrom(width: number, height: number, rows: Buffer): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bits por canal
  header[9] = 2 // color verdadero (RGB)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** PNG de un solo color con las medidas que se pidan, armado a mano: una foto válida sin guardar archivos binarios en el repo. */
export function solidPng(width: number, height: number, rgb: [number, number, number] = [200, 180, 150]): Buffer {
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => rgb).flat())])
  return pngFrom(width, height, Buffer.concat(Array.from({ length: height }, () => row)))
}

/** PNG con un degradado: una «foto» con algo que mirar, para las capturas de la vista previa. */
export function gradientPng(width: number, height: number): Buffer {
  const stride = width * 3 + 1
  const rows = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * stride + 1 + x * 3
      rows[at] = 90 + Math.round((x / width) * 120)
      rows[at + 1] = 120 + Math.round((y / height) * 90)
      rows[at + 2] = 170 - Math.round((x / width) * 60)
    }
  }
  return pngFrom(width, height, rows)
}

/** PNG de 2 × 2 píxeles: lo mínimo para tener una foto válida. */
export const tinyPng = (): Buffer => solidPng(2, 2)

/** Abre «Escena desde una foto», elige una foto mínima (con el ancho conocido, si se da) y pulsa «Analizar foto»: lo que responda lo decide el e2e con `page.route`. */
export async function analyzePhoto(page: Page, width = '') {
  await page.goto('/escena-desde-foto')
  await page.getByLabel('Foto del ambiente').setInputFiles({ name: 'sala.png', mimeType: 'image/png', buffer: tinyPng() })
  if (width) await page.getByLabel('Ancho conocido').fill(width)
  await page.getByRole('button', { name: 'Analizar foto' }).click()
}

/**
 * Una respuesta del análisis con cuatro piezas del catálogo (para las pruebas en 3D): el sofá y la mesa en el centro, el mueble de TV
 * contra el muro del fondo y la biblioteca contra el este (pegados a los muros, donde más fácil sería cruzarlos). El sofá, de espaldas a quien mira.
 */
export const FOUR_PIECES_ANALYSIS = {
  furniture: [
    { asset_id: 'sofa', x: 0.5, y: 0.82, width: 0.5, depth: 0.3, rotation_deg: 180, confidence: 0.92 },
    { asset_id: 'coffee-table', x: 0.5, y: 0.55, width: 0.4, depth: 0.25, rotation_deg: 0, confidence: 0.88 },
    { asset_id: 'tv-stand', x: 0.5, y: 0.03, width: 0.4, depth: 0.1, rotation_deg: 0, confidence: 0.9 },
    { asset_id: 'bookshelf', x: 0.99, y: 0.45, width: 0.25, depth: 0.08, rotation_deg: 90, confidence: 0.81 },
  ],
  warnings: [],
  calibration: { status: 'uncalibrated', width_m: null },
}

export const answerWith = (analysis: unknown) => (route: Route) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(analysis) })

/** Una respuesta de error con el cuerpo `{ error: { code, message } }` de la API. */
export const failWith =
  (status: number, code: string, message = 'texto técnico que la página no debe mostrar') =>
  (route: Route) =>
    route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify({ error: { code, message } }) })

export type AnalyzeRequest = {
  image: string
  mime: string
  knownWidthM?: number
  catalog: { id: string; name: string; category: string; tags: string[] }[]
}

/** Lo que mandó la página: el cuerpo JSON y el encabezado de sesión. */
export function sentBy(request: Request): { body: AnalyzeRequest; authorization: string | undefined } {
  return { body: request.postDataJSON() as AnalyzeRequest, authorization: request.headers().authorization }
}

/** Las medidas de un JPEG en base64, leídas de su marcador de tamaño (SOF). */
export function jpegSize(base64: string): { width: number; height: number } {
  const bytes = Buffer.from(base64, 'base64')
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('JPEG con un marcador inesperado')
    const marker = bytes[offset + 1] as number
    const length = bytes.readUInt16BE(offset + 2)
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrame) return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) }
    offset += 2 + length
  }
  throw new Error('no se encontró el tamaño del JPEG')
}
