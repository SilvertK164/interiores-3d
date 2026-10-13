import { RoomAnalysisSchema } from '@interiores/contract'
import { describe, expect, it, vi } from 'vitest'
import { analyzeRoom } from '../../src/analyze-room/analyze.js'
import { ProviderError, type VisionProvider } from '../../src/analyze-room/types.js'
import { AppError } from '../../src/errors.js'
import { analyzeBody } from '../support/images.js'
import { EMPTY_PLAN, PLAN, piece } from '../support/plan.js'

const body = (extra: Record<string, unknown> = {}) => analyzeBody(extra) as Parameters<typeof analyzeRoom>[0]['body']
const provides = (result: unknown): VisionProvider => vi.fn(async () => result)
const log = () => ({ warn: vi.fn() })
const plan = (extra: Record<string, unknown> = {}) => ({ ...PLAN, ...extra })

async function failureOf(promise: Promise<unknown>): Promise<AppError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(AppError)
  return error as AppError
}

describe('analyzeRoom: lo que sale bien', () => {
  it('devuelve el plano que propuso el proveedor: ambiente, cámara, aberturas, muebles y avisos', async () => {
    const result = await analyzeRoom({ provider: provides(PLAN), body: body() })
    expect(result).toEqual(PLAN)
    expect(result.furniture.map((f) => f.asset_id)).toEqual(['sofa', 'coffee-table'])
    expect(RoomAnalysisSchema.safeParse(result).success).toBe(true)
  })

  it('ya no devuelve calibración: el ancho conocido solo le sirve al proveedor para calibrar las medidas', async () => {
    const provider = provides(PLAN)
    const result = await analyzeRoom({ provider, body: body({ knownWidthM: 4.5 }) })
    expect(Object.keys(result)).toEqual(['room', 'camera', 'openings', 'furniture', 'warnings'])
    expect(provider).toHaveBeenCalledWith(expect.objectContaining({ knownWidthM: 4.5 }))
  })

  it('le entrega al proveedor la foto, el formato, el catálogo y el ancho conocido, y nada más', async () => {
    const provider = provides(EMPTY_PLAN)
    const request = body({ knownWidthM: 4 })
    await analyzeRoom({ provider, body: request })
    expect(provider).toHaveBeenCalledWith({ image: request.image, mime: 'image/jpeg', catalog: request.catalog, knownWidthM: 4 })
    const without = provides(EMPTY_PLAN)
    await analyzeRoom({ provider: without, body: body() })
    expect(Object.keys((without as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).sort()).toEqual(['catalog', 'image', 'mime'])
  })

  it('una foto sin muebles del catálogo es un resultado válido, no un error', async () => {
    const result = await analyzeRoom({ provider: provides({ ...EMPTY_PLAN, warnings: ['No se ve ningún mueble.'] }), body: body() })
    expect(result.furniture).toEqual([])
    expect(result.openings).toEqual([])
  })

  it('acepta varias piezas del mismo id (cuatro sillas) y descarta los campos que no son del contrato', async () => {
    const chair = piece({ asset_id: 'coffee-table', extra: 'sobra', type: 'silla' })
    const result = await analyzeRoom({ provider: provides(plan({ furniture: [chair, chair, chair, chair], calibration: { status: 'x' } })), body: body() })
    expect(result.furniture).toHaveLength(4)
    expect(Object.keys(result.furniture[0] ?? {}).sort()).toEqual(['against_wall', 'asset_id', 'confidence', 'facing_deg', 'on_top_of', 'x_m', 'z_m'])
    expect(result).not.toHaveProperty('calibration')
  })

  it('un mueble apoyado sobre otro, una cámara apenas afuera del muro y un campo de visión propio son válidos', async () => {
    const stacked = plan({
      camera: { x_m: 1.6, z_m: 7.8, look_at: { x_m: 1.6, z_m: 1 }, fov_deg: 75 },
      furniture: [piece({ asset_id: 'coffee-table', against_wall: 'n', facing_deg: 0 }), piece({ on_top_of: 0 })],
    })
    const result = await analyzeRoom({ provider: provides(stacked), body: body() })
    expect(result.furniture[1]?.on_top_of).toBe(0)
    expect(result.camera.fov_deg).toBe(75)
  })

  it('sin avisos del proveedor devuelve una lista vacía; recorta los avisos largos y descarta los vacíos', async () => {
    const { warnings: _omitted, ...withoutWarnings } = EMPTY_PLAN
    const none = await analyzeRoom({ provider: provides(withoutWarnings), body: body() })
    expect(none.warnings).toEqual([])
    const long = 'a'.repeat(500)
    const many = await analyzeRoom({ provider: provides({ ...EMPTY_PLAN, warnings: ['  uno  ', '', '   ', long] }), body: body() })
    expect(many.warnings).toHaveLength(2)
    expect(many.warnings[0]).toBe('uno')
    expect(many.warnings[1]?.length).toBeLessThanOrEqual(300)
  })

  it('no deja pasar más de 20 avisos', async () => {
    const warnings = Array.from({ length: 50 }, (_, i) => `aviso ${i}`)
    const result = await analyzeRoom({ provider: provides({ ...EMPTY_PLAN, warnings }), body: body() })
    expect(result.warnings).toHaveLength(20)
  })
})

describe('analyzeRoom: lo que sale mal es siempre un 502 analisis_fallido', () => {
  const old = { asset_id: 'sofa', x: 0.5, y: 0.6, width: 0.3, depth: 0.12, rotation_deg: 0, confidence: 0.8 }
  const invalid: [string, unknown][] = [
    ['un id fuera del catálogo enviado', plan({ furniture: [piece({ asset_id: 'lampara-inventada' })] })],
    ['un id del catálogo local que no se envió en este pedido', plan({ furniture: [piece({ asset_id: 'bookshelf' })] })],
    ['el formato anterior (proporciones de la imagen y calibración)', { furniture: [old], warnings: [], calibration: { status: 'uncalibrated', width_m: null } }],
    ['un ambiente de 20 m de ancho', plan({ room: { width_m: 20, depth_m: 4 } })],
    ['un ambiente de 1 m de fondo', plan({ room: { width_m: 4, depth_m: 1 } })],
    ['una posición fuera de rango (x_m: 30)', plan({ furniture: [piece({ x_m: 30 })] })],
    ['una confianza mayor que 1', plan({ furniture: [piece({ confidence: 1.2 })] })],
    ['un giro de más de una vuelta', plan({ furniture: [piece({ facing_deg: 400 })] })],
    ['un número en texto', plan({ furniture: [piece({ x_m: '1.6' })] })],
    ['un muro que no existe', plan({ furniture: [piece({ against_wall: 'norte' })] })],
    ['una puerta con un ancho de 0', plan({ openings: [{ type: 'door', wall: 'n', at_m: 1, width_m: 0 }] })],
    ['una cámara a 3 m del rectángulo del ambiente', plan({ camera: { x_m: 1.6, z_m: 10, look_at: { x_m: 1.6, z_m: 0 } } })],
    ['una cámara que mira al mismo punto donde está', plan({ camera: { x_m: 1.6, z_m: 6, look_at: { x_m: 1.6, z_m: 6 } } })],
    ['un on_top_of que apunta a un mueble que no existe', plan({ furniture: [piece(), piece({ on_top_of: 7 })] })],
    ['un mueble apoyado sobre sí mismo', plan({ furniture: [piece({ on_top_of: 0 })] })],
    ['dos muebles apoyados el uno sobre el otro', plan({ furniture: [piece({ on_top_of: 1 }), piece({ on_top_of: 0 })] })],
    ['otra forma de respuesta', { nope: 1 }],
    ['una lista en lugar de un objeto', []],
    ['nada', null],
    ['más de 100 muebles', plan({ furniture: Array.from({ length: 101 }, () => piece()) })],
    ['avisos que no son texto', plan({ warnings: [1, 2] })],
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

  it('una respuesta que no cumple el contrato se registra con el campo que falló y sin su contenido', async () => {
    const logger = log()
    const secret = 'secreto del modelo'
    await failureOf(analyzeRoom({ provider: provides(plan({ furniture: [piece({ x_m: 30 })], warnings: [secret] })), body: body(), log: logger }))
    await failureOf(analyzeRoom({ provider: provides(plan({ furniture: [piece({ asset_id: 'invento' })] })), body: body(), log: logger }))
    await failureOf(analyzeRoom({ provider: provides(plan({ furniture: [piece(), piece({ on_top_of: 5 })] })), body: body(), log: logger }))
    await failureOf(analyzeRoom({ provider: provides(null), body: body(), log: logger }))
    expect(logger.warn.mock.calls.map((call) => call[0])).toEqual([
      { reason: 'invalid_result:furniture.0.x_m' },
      { reason: 'unknown_asset_id' },
      { reason: 'invalid_result:furniture.1.on_top_of' },
      { reason: 'invalid_result' },
    ])
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(secret)
  })
})
