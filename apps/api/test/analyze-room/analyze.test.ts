import { RoomAnalysisSchema } from '@interiores/contract'
import { describe, expect, it, vi } from 'vitest'
import { analyzeRoom } from '../../src/analyze-room/analyze.js'
import { ProviderError, type VisionProvider } from '../../src/analyze-room/types.js'
import { AppError } from '../../src/errors.js'
import { analyzeBody } from '../support/images.js'

const body = (extra: Record<string, unknown> = {}) => analyzeBody(extra) as Parameters<typeof analyzeRoom>[0]['body']
const piece = (extra: object = {}) => ({ asset_id: 'sofa', x: 0.5, y: 0.6, width: 0.3, depth: 0.12, rotation_deg: 0, confidence: 0.8, ...extra })
const provides = (result: unknown): VisionProvider => vi.fn(async () => result)
const log = () => ({ warn: vi.fn() })

async function failureOf(promise: Promise<unknown>): Promise<AppError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(AppError)
  return error as AppError
}

describe('analyzeRoom: lo que sale bien', () => {
  it('devuelve los muebles y los avisos que propuso el proveedor, sin calibrar si no se indicó el ancho', async () => {
    const provider = provides({ furniture: [piece(), piece({ asset_id: 'coffee-table', x: 0.5, y: 0.5 })], warnings: ['oclusión parcial'] })
    const result = await analyzeRoom({ provider, body: body() })
    expect(result.furniture.map((f) => f.asset_id)).toEqual(['sofa', 'coffee-table'])
    expect(result.warnings).toEqual(['oclusión parcial'])
    expect(result.calibration).toEqual({ status: 'uncalibrated', width_m: null })
    expect(RoomAnalysisSchema.safeParse(result).success).toBe(true)
  })

  it('con el ancho conocido lo devuelve como calibración del usuario', async () => {
    const result = await analyzeRoom({ provider: provides({ furniture: [], warnings: [] }), body: body({ knownWidthM: 4.5 }) })
    expect(result.calibration).toEqual({ status: 'user_provided', width_m: 4.5 })
  })

  it('le entrega al proveedor la foto, el formato y el catálogo recibidos, y nada más', async () => {
    const provider = provides({ furniture: [], warnings: [] })
    const request = body({ knownWidthM: 4 })
    await analyzeRoom({ provider, body: request })
    expect(provider).toHaveBeenCalledWith({ image: request.image, mime: 'image/jpeg', catalog: request.catalog })
  })

  it('una foto sin muebles del catálogo es un resultado válido, no un error', async () => {
    const result = await analyzeRoom({ provider: provides({ furniture: [], warnings: ['No se ve ningún mueble.'] }), body: body() })
    expect(result.furniture).toEqual([])
  })

  it('acepta varias piezas del mismo id (cuatro sillas) y descarta los campos que no son del contrato', async () => {
    const chair = piece({ asset_id: 'coffee-table', extra: 'sobra', type: 'silla' })
    const result = await analyzeRoom({ provider: provides({ furniture: [chair, chair, chair, chair], warnings: [] }), body: body() })
    expect(result.furniture).toHaveLength(4)
    expect(Object.keys(result.furniture[0] ?? {}).sort()).toEqual(['asset_id', 'confidence', 'depth', 'rotation_deg', 'width', 'x', 'y'])
  })

  it('sin avisos del proveedor devuelve una lista vacía; recorta los avisos largos y descarta los vacíos', async () => {
    const none = await analyzeRoom({ provider: provides({ furniture: [] }), body: body() })
    expect(none.warnings).toEqual([])
    const long = 'a'.repeat(500)
    const many = await analyzeRoom({ provider: provides({ furniture: [], warnings: ['  uno  ', '', '   ', long] }), body: body() })
    expect(many.warnings).toHaveLength(2)
    expect(many.warnings[0]).toBe('uno')
    expect(many.warnings[1]?.length).toBeLessThanOrEqual(300)
  })

  it('no deja pasar más de 20 avisos', async () => {
    const warnings = Array.from({ length: 50 }, (_, i) => `aviso ${i}`)
    const result = await analyzeRoom({ provider: provides({ furniture: [], warnings }), body: body() })
    expect(result.warnings).toHaveLength(20)
  })
})

describe('analyzeRoom: lo que sale mal es siempre un 502 analisis_fallido', () => {
  const invalid: [string, unknown][] = [
    ['un id fuera del catálogo enviado', { furniture: [piece({ asset_id: 'lampara-inventada' })], warnings: [] }],
    ['un id del catálogo local que no se envió en este pedido', { furniture: [piece({ asset_id: 'bookshelf' })], warnings: [] }],
    ['el formato anterior con type en lugar de asset_id', { furniture: [{ type: 'sofa', x: 0.5, y: 0.6, width: 0.3, depth: 0.1, rotation_deg: 0, confidence: 0.8 }], warnings: [] }],
    ['una proporción fuera de rango (x: 1.7)', { furniture: [piece({ x: 1.7 })], warnings: [] }],
    ['una confianza mayor que 1', { furniture: [piece({ confidence: 1.2 })], warnings: [] }],
    ['un ancho de 0', { furniture: [piece({ width: 0 })], warnings: [] }],
    ['un giro de más de una vuelta', { furniture: [piece({ rotation_deg: 400 })], warnings: [] }],
    ['un número en texto', { furniture: [piece({ x: '0.5' })], warnings: [] }],
    ['otra forma de respuesta', { nope: 1 }],
    ['una lista en lugar de un objeto', []],
    ['nada', null],
    ['más de 100 muebles', { furniture: Array.from({ length: 101 }, () => piece()), warnings: [] }],
    ['avisos que no son texto', { furniture: [], warnings: [1, 2] }],
  ]

  it.each(invalid)('si el proveedor devuelve %s', async (_label, result) => {
    const error = await failureOf(analyzeRoom({ provider: provides(result), body: body() }))
    expect(error.status).toBe(502)
    expect(error.code).toBe('analisis_fallido')
    expect(error.message).toMatch(/No pudimos analizar la foto/)
  })

  it('si el proveedor falla, responde igual y registra solo el motivo', async () => {
    const logger = log()
    const provider: VisionProvider = async () => {
      throw new ProviderError('http_429:RESOURCE_EXHAUSTED')
    }
    const error = await failureOf(analyzeRoom({ provider, body: body(), log: logger }))
    expect(error.code).toBe('analisis_fallido')
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn.mock.calls[0]?.[0]).toEqual({ reason: 'http_429:RESOURCE_EXHAUSTED' })
  })

  it('un error cualquiera del proveedor (aunque traiga la foto en su mensaje) no se repite ni se registra', async () => {
    const logger = log()
    const request = body()
    const provider: VisionProvider = async () => {
      throw new Error(`falló con ${request.image}`)
    }
    const error = await failureOf(analyzeRoom({ provider, body: request, log: logger }))
    expect(error.code).toBe('analisis_fallido')
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(request.image)
    expect(logger.warn.mock.calls[0]?.[0]).toEqual({ reason: 'unexpected' })
  })

  it('una respuesta que no cumple el contrato se registra con un motivo y sin su contenido', async () => {
    const logger = log()
    await failureOf(analyzeRoom({ provider: provides({ furniture: [piece({ x: 1.7 })], warnings: ['secreto del modelo'] }), body: body(), log: logger }))
    await failureOf(analyzeRoom({ provider: provides({ furniture: [piece({ asset_id: 'invento' })], warnings: [] }), body: body(), log: logger }))
    expect(logger.warn.mock.calls.map((call) => call[0])).toEqual([{ reason: 'invalid_result' }, { reason: 'unknown_asset_id' }])
  })
})
