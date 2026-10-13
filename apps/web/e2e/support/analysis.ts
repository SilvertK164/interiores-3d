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
 * El plano del salón largo y angosto (3,2 × 7 m) que «devuelve Gemini», con los errores típicos de una foto para que el acomodador trabaje: la
 * foto está tomada desde el extremo sur mirando al norte; la tele sobre su mueble contra el muro del fondo (el mueble despegado 14 cm), el sofá
 * frente a ella pero de espaldas (mirando al sur), la mesa de centro sobre la alfombra, una planta a la izquierda y un sillón contra el muro este,
 * bajo la ventana de la derecha. Una puerta en el muro oeste, cerca de la cámara.
 */
export const HALL_ANALYSIS = {
  room: { width_m: 3.2, depth_m: 7 },
  camera: { x_m: 1.6, z_m: 6.8, look_at: { x_m: 1.6, z_m: 0 } },
  openings: [
    { type: 'window', wall: 'e', at_m: 2, width_m: 1.4 },
    { type: 'door', wall: 'w', at_m: 1, width_m: 0.9 },
  ],
  furniture: [
    { asset_id: 'tv-stand', x_m: 1.6, z_m: 0.45, facing_deg: 0, against_wall: 'n', on_top_of: null, confidence: 0.9 },
    { asset_id: 'television', x_m: 1.6, z_m: 0.45, facing_deg: 0, against_wall: null, on_top_of: 0, confidence: 0.95 },
    { asset_id: 'rectangular-carpet', x_m: 1.6, z_m: 3, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.85 },
    { asset_id: 'coffee-table', x_m: 1.6, z_m: 3, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.9 },
    { asset_id: 'sofa', x_m: 1.6, z_m: 4.9, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.92 },
    { asset_id: 'indoor-plant', x_m: 0.55, z_m: 1.4, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.7 },
    { asset_id: 'livingroom-chair', x_m: 2.7, z_m: 1.7, facing_deg: 90, against_wall: 'e', on_top_of: null, confidence: 0.8 },
  ],
  warnings: ['Los cuadros de la pared no están en el catálogo: no se agregaron.'],
}

/** Una foto tomada desde la esquina sureste mirando en diagonal hacia el noroeste: la cámara queda pegada a dos muros (fuera del rectángulo por 0,4 m). */
export const CORNER_ANALYSIS = {
  room: { width_m: 5, depth_m: 4 },
  camera: { x_m: 5.4, z_m: 4.4, look_at: { x_m: 0.5, z_m: 0.5 }, fov_deg: 70 },
  openings: [{ type: 'window', wall: 'n', at_m: 2.5, width_m: 1.6 }],
  furniture: [
    { asset_id: 'sofa', x_m: 2.5, z_m: 0.65, facing_deg: 0, against_wall: 'n', on_top_of: null, confidence: 0.9 },
    { asset_id: 'coffee-table', x_m: 2.5, z_m: 2.2, facing_deg: 0, against_wall: null, on_top_of: null, confidence: 0.85 },
  ],
  warnings: [],
}

/** Un plano sin ningún mueble del catálogo (solo el ambiente y su aviso). */
export const EMPTY_ANALYSIS = {
  room: { width_m: 4, depth_m: 3 },
  camera: { x_m: 2, z_m: 2.8, look_at: { x_m: 2, z_m: 0 } },
  openings: [],
  furniture: [],
  warnings: ['No se ve ningún mueble.'],
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
  catalog: { id: string; name: string; category: string; tags: string[]; dimensions_m?: number[] }[]
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
