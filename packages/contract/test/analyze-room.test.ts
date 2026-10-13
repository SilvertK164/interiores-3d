import { describe, expect, it } from 'vitest'
import {
  ANALYSES_PER_HOUR,
  ANALYZE_BODY_MAX_BYTES,
  ANALYZE_CATALOG_MAX_BYTES,
  ANALYZE_CATALOG_MAX_ITEMS,
  ANALYZE_IMAGE_MAX_BASE64_CHARS,
  ANALYZE_IMAGE_MAX_BYTES,
  ANALYZE_MIME_TYPES,
  AnalyzeRoomBodySchema,
  CalibrationSchema,
  CatalogOptionSchema,
  DetectedFurnitureSchema,
  ERROR_CODES,
  RoomAnalysisSchema,
} from '../src/index.js'

const option = (id: string, extra: object = {}) => ({ id, name: 'Sofá', category: 'seating', tags: ['living-room'], ...extra })
const body = (extra: object = {}) => ({ image: '/9j/4AAQ', mime: 'image/jpeg', catalog: [option('sofa')], ...extra })
const piece = (extra: object = {}) => ({ asset_id: 'sofa', x: 0.5, y: 0.5, width: 0.3, depth: 0.2, rotation_deg: 90, confidence: 0.9, ...extra })
const accepts = (schema: { safeParse(v: unknown): { success: boolean } }, value: unknown) => schema.safeParse(value).success

describe('constantes del análisis de fotos', () => {
  it('la foto decodificada pesa hasta 3 MiB y en base64 son exactamente 4 caracteres por cada 3 bytes', () => {
    expect(ANALYZE_IMAGE_MAX_BYTES).toBe(3 * 1024 * 1024)
    expect(ANALYZE_IMAGE_MAX_BASE64_CHARS).toBe(Buffer.alloc(ANALYZE_IMAGE_MAX_BYTES).toString('base64').length)
  })

  it('el cuerpo más grande posible cabe en los 4,5 MB que Vercel admite por petición', () => {
    expect(ANALYZE_BODY_MAX_BYTES).toBeGreaterThanOrEqual(ANALYZE_IMAGE_MAX_BASE64_CHARS + ANALYZE_CATALOG_MAX_BYTES)
    expect(ANALYZE_BODY_MAX_BYTES).toBeLessThan(4_500_000)
  })

  it('el catálogo admite hasta 100 opciones y 64 KB; el tope es de 10 análisis por hora', () => {
    expect(ANALYZE_CATALOG_MAX_ITEMS).toBe(100)
    expect(ANALYZE_CATALOG_MAX_BYTES).toBe(64 * 1024)
    expect(ANALYSES_PER_HOUR).toBe(10)
  })

  it('los formatos aceptados son JPEG, PNG y WebP', () => {
    expect([...ANALYZE_MIME_TYPES]).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })

  it('el contrato trae un código de error para cada falla del análisis', () => {
    expect(ERROR_CODES).toMatchObject({
      analysisUnavailable: 'analisis_no_disponible',
      analysisFailed: 'analisis_fallido',
      invalidCatalog: 'catalogo_invalido',
      unreadableImage: 'imagen_ilegible',
      imageTooLarge: 'imagen_demasiado_grande',
      analysisLimit: 'limite_de_analisis',
    })
  })
})

describe('AnalyzeRoomBody', () => {
  it('acepta lo mínimo: foto, formato y catálogo', () => {
    expect(accepts(AnalyzeRoomBodySchema, body())).toBe(true)
  })

  it('solo admite JPEG, PNG y WebP', () => {
    for (const mime of ANALYZE_MIME_TYPES) expect(accepts(AnalyzeRoomBodySchema, body({ mime })), mime).toBe(true)
    for (const mime of ['image/gif', 'image/heic', 'application/pdf', 'IMAGE/JPEG', '']) {
      expect(accepts(AnalyzeRoomBodySchema, body({ mime })), mime).toBe(false)
    }
  })

  it('la foto es obligatoria, no vacía y de hasta 3 MiB una vez decodificada', () => {
    expect(accepts(AnalyzeRoomBodySchema, { ...body(), image: undefined })).toBe(false)
    expect(accepts(AnalyzeRoomBodySchema, body({ image: '' }))).toBe(false)
    expect(accepts(AnalyzeRoomBodySchema, body({ image: 'A'.repeat(ANALYZE_IMAGE_MAX_BASE64_CHARS) }))).toBe(true)
    expect(accepts(AnalyzeRoomBodySchema, body({ image: 'A'.repeat(ANALYZE_IMAGE_MAX_BASE64_CHARS + 1) }))).toBe(false)
  })

  it('el ancho conocido es opcional y va de más de 0 a 100 metros', () => {
    expect(accepts(AnalyzeRoomBodySchema, body({ knownWidthM: 4.5 }))).toBe(true)
    expect(accepts(AnalyzeRoomBodySchema, body({ knownWidthM: 100 }))).toBe(true)
    expect(accepts(AnalyzeRoomBodySchema, body({ knownWidthM: 0.01 }))).toBe(true)
    for (const bad of [0, -1, 100.5, '4', null, Number.NaN]) {
      expect(accepts(AnalyzeRoomBodySchema, body({ knownWidthM: bad })), String(bad)).toBe(false)
    }
  })
})

describe('CatalogOption y catálogo', () => {
  it('una opción trae id, nombre, categoría y etiquetas; las etiquetas son opcionales', () => {
    expect(accepts(CatalogOptionSchema, option('sofa'))).toBe(true)
    expect(CatalogOptionSchema.parse({ id: 'sofa', name: 'Sofá', category: 'seating' }).tags).toEqual([])
  })

  it('recorta espacios de los textos', () => {
    expect(CatalogOptionSchema.parse(option(' sofa ', { name: '  Sofá  ' }))).toMatchObject({ id: 'sofa', name: 'Sofá' })
  })

  it('no admite campos de más (rutas, tamaños): el servicio solo debe saber lo que elige', () => {
    expect(accepts(CatalogOptionSchema, option('sofa', { src: '/items/sofa/model.glb' }))).toBe(false)
    expect(accepts(CatalogOptionSchema, option('sofa', { dimensions: [1, 1, 1] }))).toBe(false)
  })

  it('el id empieza con letra o número y sigue con letras, números, punto, guion, guion bajo o dos puntos', () => {
    for (const id of ['sofa', 'coffee-table', 'a', 'param:bookshelf', 'v1.2_x', 'A'.repeat(100)]) {
      expect(accepts(CatalogOptionSchema, option(id)), id).toBe(true)
    }
    for (const id of ['', '-sofa', ' ', 'sofa\nx', 'sofá', 'a'.repeat(101), 'a/b', 'a b']) {
      expect(accepts(CatalogOptionSchema, option(id)), JSON.stringify(id)).toBe(false)
    }
  })

  it('acota nombre (120), categoría (60), etiquetas (10 de hasta 40 caracteres)', () => {
    expect(accepts(CatalogOptionSchema, option('x', { name: 'n'.repeat(120) }))).toBe(true)
    expect(accepts(CatalogOptionSchema, option('x', { name: 'n'.repeat(121) }))).toBe(false)
    expect(accepts(CatalogOptionSchema, option('x', { name: '   ' }))).toBe(false)
    expect(accepts(CatalogOptionSchema, option('x', { category: 'c'.repeat(61) }))).toBe(false)
    expect(accepts(CatalogOptionSchema, option('x', { category: '' }))).toBe(false)
    expect(accepts(CatalogOptionSchema, option('x', { tags: Array.from({ length: 10 }, (_, i) => `t${i}`) }))).toBe(true)
    expect(accepts(CatalogOptionSchema, option('x', { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }))).toBe(false)
    expect(accepts(CatalogOptionSchema, option('x', { tags: ['t'.repeat(41)] }))).toBe(false)
    expect(accepts(CatalogOptionSchema, option('x', { tags: [''] }))).toBe(false)
  })

  it('el catálogo tiene de 1 a 100 opciones', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => option(`pieza-${i}`))
    expect(accepts(AnalyzeRoomBodySchema, body({ catalog: [] }))).toBe(false)
    expect(accepts(AnalyzeRoomBodySchema, body({ catalog: many(100) }))).toBe(true)
    expect(accepts(AnalyzeRoomBodySchema, body({ catalog: many(101) }))).toBe(false)
    expect(accepts(AnalyzeRoomBodySchema, body({ catalog: 'sofa' }))).toBe(false)
  })

  it('los ids no se repiten', () => {
    const result = AnalyzeRoomBodySchema.safeParse(body({ catalog: [option('sofa'), option('mesa'), option('sofa')] }))
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path[0]).toBe('catalog')
  })

  it('el catálogo serializado pesa hasta 64 KB (en UTF-8: una ñ cuenta por dos bytes)', () => {
    const heavy = (n: number) =>
      Array.from({ length: n }, (_, i) => option(`pieza-${i}`, { name: 'ñ'.repeat(120), category: 'ñ'.repeat(60), tags: Array.from({ length: 10 }, () => 'ñ'.repeat(40)) }))
    expect(accepts(AnalyzeRoomBodySchema, body({ catalog: heavy(10) }))).toBe(true)
    const tooBig = AnalyzeRoomBodySchema.safeParse(body({ catalog: heavy(100) }))
    expect(tooBig.success).toBe(false)
    expect(tooBig.error?.issues.some((issue) => issue.path[0] === 'catalog')).toBe(true)
  })

  it('un error dentro de una opción se reporta en catalog', () => {
    const result = AnalyzeRoomBodySchema.safeParse(body({ catalog: [option('sofa'), option('mesa', { name: '' })] }))
    expect(result.error?.issues[0]?.path.slice(0, 2)).toEqual(['catalog', 1])
  })
})

describe('RoomAnalysis (la respuesta)', () => {
  const analysis = (furniture: object[] = [piece()]) => ({
    furniture,
    warnings: ['La planta está tapada por el sofá.'],
    calibration: { status: 'uncalibrated', width_m: null },
  })

  it('acepta un análisis completo y uno sin muebles', () => {
    expect(accepts(RoomAnalysisSchema, analysis())).toBe(true)
    expect(accepts(RoomAnalysisSchema, { ...analysis([]), warnings: [] })).toBe(true)
  })

  it('cada mueble es un asset_id con posición, tamaño, giro y confianza dentro de sus rangos', () => {
    const ok = [{}, { x: 0 }, { x: 1 }, { y: 1 }, { width: 1 }, { rotation_deg: -360 }, { rotation_deg: 360 }, { confidence: 0 }]
    for (const extra of ok) expect(accepts(DetectedFurnitureSchema, piece(extra)), JSON.stringify(extra)).toBe(true)
    const bad = [{ x: -0.01 }, { x: 1.01 }, { y: 1.01 }, { width: 0 }, { width: 1.01 }, { depth: 0 }, { rotation_deg: 361 }, { rotation_deg: -361 }, { confidence: 1.01 }, { asset_id: '' }, { asset_id: 'a'.repeat(101) }]
    for (const extra of bad) expect(accepts(DetectedFurnitureSchema, piece(extra)), JSON.stringify(extra)).toBe(false)
  })

  it('la calibración es uncalibrated o user_provided, con el ancho en metros o null', () => {
    expect(accepts(CalibrationSchema, { status: 'user_provided', width_m: 4.5 })).toBe(true)
    expect(accepts(CalibrationSchema, { status: 'uncalibrated', width_m: null })).toBe(true)
    expect(accepts(CalibrationSchema, { status: 'otra', width_m: null })).toBe(false)
    expect(accepts(CalibrationSchema, { status: 'uncalibrated' })).toBe(false)
  })

  it('exige los tres campos', () => {
    for (const key of ['furniture', 'warnings', 'calibration']) {
      const { [key]: _omitted, ...rest } = analysis() as Record<string, unknown>
      expect(accepts(RoomAnalysisSchema, rest), key).toBe(false)
    }
  })
})
