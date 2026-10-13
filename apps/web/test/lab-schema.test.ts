import { describe, expect, it } from 'vitest'
import { buildAnalysisCatalog } from '../src/lib/lab/analysis-catalog'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import { RoomAnalysisSchema } from '../src/lib/lab/schema'
import { availableAssets } from './support/asset-ids'

const piece = { asset_id: 'sofa', x: 0.5, y: 0.6, width: 0.3, depth: 0.12, rotation_deg: 0, confidence: 0.8 }
const response = { furniture: [piece], warnings: ['oclusión parcial'], calibration: { status: 'uncalibrated', width_m: null } }

describe('RoomAnalysisSchema (la respuesta de POST /v1/analyze-room, definida en el contrato)', () => {
  it('acepta la respuesta tal como la arma la API', () => {
    expect(RoomAnalysisSchema.parse(response)).toEqual(response)
  })

  it('acepta la calibración con el ancho que indicó la persona', () => {
    const calibrated = { ...response, calibration: { status: 'user_provided', width_m: 4.5 } }
    expect(RoomAnalysisSchema.parse(calibrated).calibration).toEqual({ status: 'user_provided', width_m: 4.5 })
  })

  it('acepta una respuesta sin muebles ni avisos', () => {
    const empty = { furniture: [], warnings: [], calibration: { status: 'uncalibrated', width_m: null } }
    expect(RoomAnalysisSchema.safeParse(empty).success).toBe(true)
  })

  it.each([
    ['una posición fuera de 0..1', { ...piece, x: 1.7 }],
    ['un ancho de 0', { ...piece, width: 0 }],
    ['un fondo mayor que 1', { ...piece, depth: 1.2 }],
    ['un giro de más de 360 grados', { ...piece, rotation_deg: 400 }],
    ['una confianza mayor que 1', { ...piece, confidence: 1.4 }],
    ['una pieza sin asset_id', { ...piece, asset_id: undefined }],
    ['un asset_id vacío', { ...piece, asset_id: '' }],
    ['un asset_id de más de 100 caracteres', { ...piece, asset_id: 'a'.repeat(101) }],
    ['un asset_id que no es texto', { ...piece, asset_id: 7 }],
    ['el formato anterior de TP3 (type en lugar de asset_id)', { ...piece, asset_id: undefined, type: 'sofa' }],
  ])('rechaza %s', (_name, bad) => {
    expect(RoomAnalysisSchema.safeParse({ ...response, furniture: [bad] }).success).toBe(false)
  })

  it.each([
    ['sin calibración', { furniture: [piece], warnings: [] }],
    ['con un estado de calibración desconocido', { ...response, calibration: { status: 'raro', width_m: null } }],
    ['con avisos que no son texto', { ...response, warnings: [3] }],
    ['con la lista de muebles mal formada', { ...response, furniture: 'sofa' }],
  ])('rechaza una respuesta %s', (_name, bad) => {
    expect(RoomAnalysisSchema.safeParse(bad).success).toBe(false)
  })

  it('deja pasar un asset_id que no conoce: resolverlo contra el catálogo (y avisar si no está) es cosa de quien lo usa, no del esquema', () => {
    const parsed = RoomAnalysisSchema.parse({ ...response, furniture: [{ ...piece, asset_id: 'lampara-rara' }] })
    expect(parsed.furniture[0]?.asset_id).toBe('lampara-rara')
  })

  it('descarta los campos que no conoce', () => {
    const parsed = RoomAnalysisSchema.parse({ ...response, extra: 1, furniture: [{ ...piece, color: 'rojo' }] })
    expect(parsed).not.toHaveProperty('extra')
    expect(parsed.furniture[0]).not.toHaveProperty('color')
  })
})

describe('SAMPLE_ANALYSIS (el análisis de ejemplo)', () => {
  const { pieces } = buildAnalysisCatalog(availableAssets().map((a) => ({ id: a.id, name: a.name })))

  it('cumple el esquema del contrato', () => {
    expect(RoomAnalysisSchema.safeParse(SAMPLE_ANALYSIS).success).toBe(true)
  })

  it('trae siete piezas distintas, todas del catálogo que se le ofrece al análisis (ninguna inventada)', () => {
    const ids = SAMPLE_ANALYSIS.furniture.map((f) => f.asset_id)
    expect(new Set(ids).size).toBe(7)
    for (const id of ids) expect(pieces.has(id), id).toBe(true)
  })

  it('incluye una pieza de confianza baja y un aviso, para ver cómo se comporta cada caso', () => {
    const confidences = SAMPLE_ANALYSIS.furniture.map((f) => f.confidence)
    expect(confidences.filter((c) => c < 0.5)).toHaveLength(1)
    expect(SAMPLE_ANALYSIS.warnings.length).toBeGreaterThanOrEqual(1)
  })
})
