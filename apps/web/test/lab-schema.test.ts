import { describe, expect, it } from 'vitest'
import { buildAnalysisCatalog } from '../src/lib/lab/analysis-catalog'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import { RoomAnalysisSchema } from '../src/lib/lab/schema'
import { availableAssets } from './support/asset-ids'

// La respuesta de POST /v1/analyze-room se define una sola vez, en `packages/contract` (sus reglas las prueba el contrato): aquí solo se
// comprueba que la web la usa tal cual y que el análisis de ejemplo cumple el contrato con piezas del catálogo.

const piece = { asset_id: 'sofa', x_m: 1.6, z_m: 4.5, facing_deg: 180, against_wall: null, on_top_of: null, confidence: 0.8 }
const response = {
  room: { width_m: 3.2, depth_m: 7 },
  camera: { x_m: 1.6, z_m: 6.8, look_at: { x_m: 1.6, z_m: 0 } },
  openings: [{ type: 'window', wall: 'e', at_m: 2, width_m: 1.4 }],
  furniture: [piece],
  warnings: ['oclusión parcial'],
}

describe('RoomAnalysisSchema (la respuesta de POST /v1/analyze-room, definida en el contrato)', () => {
  it('acepta la respuesta tal como la arma la API', () => {
    expect(RoomAnalysisSchema.parse(response)).toEqual(response)
  })

  it('acepta un plano sin muebles, aberturas ni avisos', () => {
    expect(RoomAnalysisSchema.safeParse({ ...response, furniture: [], openings: [], warnings: [] }).success).toBe(true)
  })

  it.each([
    ['una posición fuera de rango', { ...piece, x_m: 20 }],
    ['un giro de más de 360 grados', { ...piece, facing_deg: 400 }],
    ['una confianza mayor que 1', { ...piece, confidence: 1.4 }],
    ['un muro que no existe', { ...piece, against_wall: 'norte' }],
    ['un on_top_of con un índice negativo', { ...piece, on_top_of: -1 }],
    ['una pieza sin asset_id', { ...piece, asset_id: undefined }],
    ['un asset_id vacío', { ...piece, asset_id: '' }],
    ['un asset_id de más de 100 caracteres', { ...piece, asset_id: 'a'.repeat(101) }],
    ['un asset_id que no es texto', { ...piece, asset_id: 7 }],
    ['el formato anterior (proporciones de la imagen)', { asset_id: 'sofa', x: 0.5, y: 0.6, width: 0.3, depth: 0.12, rotation_deg: 0, confidence: 0.8 }],
  ])('rechaza %s', (_name, bad) => {
    expect(RoomAnalysisSchema.safeParse({ ...response, furniture: [bad] }).success).toBe(false)
  })

  it.each([
    ['sin ambiente', { ...response, room: undefined }],
    ['sin cámara', { ...response, camera: undefined }],
    ['con un ambiente de 20 m', { ...response, room: { width_m: 20, depth_m: 3 } }],
    ['con una cámara a 3 m del ambiente', { ...response, camera: { x_m: 1.6, z_m: 10, look_at: { x_m: 1.6, z_m: 0 } } }],
    ['con avisos que no son texto', { ...response, warnings: [3] }],
    ['con la lista de muebles mal formada', { ...response, furniture: 'sofa' }],
    ['con el formato anterior (muebles y calibración)', { furniture: [piece], warnings: [], calibration: { status: 'uncalibrated', width_m: null } }],
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

  it('trae nueve piezas distintas, todas del catálogo que se le ofrece al análisis (ninguna inventada)', () => {
    const ids = SAMPLE_ANALYSIS.furniture.map((f) => f.asset_id)
    expect(new Set(ids).size).toBe(9)
    for (const id of ids) expect(pieces.has(id), id).toBe(true)
  })

  it('incluye una pieza de confianza baja y un aviso, para ver cómo se comporta cada caso', () => {
    const confidences = SAMPLE_ANALYSIS.furniture.map((f) => f.confidence)
    expect(confidences.filter((c) => c < 0.5)).toHaveLength(1)
    expect(SAMPLE_ANALYSIS.warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('muestra lo que sabe hacer el plano: una tele apoyada sobre su mueble, piezas contra un muro y una puerta y una ventana', () => {
    expect(SAMPLE_ANALYSIS.furniture.some((f) => f.on_top_of !== null)).toBe(true)
    expect(SAMPLE_ANALYSIS.furniture.some((f) => f.against_wall !== null)).toBe(true)
    expect(SAMPLE_ANALYSIS.openings.map((o) => o.type).sort()).toEqual(['door', 'window'])
  })
})
