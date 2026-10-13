import { describe, expect, it } from 'vitest'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import { FURNITURE_TYPES, RoomAnalysisSchema, furnitureLabel, isFurnitureType } from '../src/lib/lab/schema'

const piece = { type: 'sofa', x: 0.5, y: 0.6, width: 0.3, depth: 0.12, rotation_deg: 0, confidence: 0.8 }
const response = { furniture: [piece], warnings: ['oclusión parcial'], calibration: { status: 'uncalibrated', width_m: null } }

describe('RoomAnalysisSchema (la respuesta de TP3)', () => {
  it('acepta la respuesta tal como la arma el backend de TP3', () => {
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
    ['una pieza sin tipo', { ...piece, type: undefined }],
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

  it('deja pasar un tipo que no conoce: qué hacer con él es cosa del modelado, no del esquema', () => {
    const parsed = RoomAnalysisSchema.parse({ ...response, furniture: [{ ...piece, type: 'lampara' }] })
    expect(parsed.furniture[0]?.type).toBe('lampara')
  })

  it('descarta los campos que no conoce', () => {
    const parsed = RoomAnalysisSchema.parse({ ...response, extra: 1, furniture: [{ ...piece, color: 'rojo' }] })
    expect(parsed).not.toHaveProperty('extra')
    expect(parsed.furniture[0]).not.toHaveProperty('color')
  })
})

describe('tipos de mueble de TP3', () => {
  it('son siete y se reconocen', () => {
    expect([...FURNITURE_TYPES]).toEqual(['sofa', 'mesa', 'silla', 'estante', 'cama', 'planta', 'tv'])
    expect(isFurnitureType('cama')).toBe(true)
    expect(isFurnitureType('lampara')).toBe(false)
  })

  it('tienen nombre en castellano para mostrar en pantalla', () => {
    expect(FURNITURE_TYPES.map((t) => furnitureLabel(t))).toEqual(['Sofá', 'Mesa', 'Silla', 'Estante', 'Cama', 'Planta', 'Televisor'])
  })

  it('un tipo desconocido se muestra tal cual, aclarando que no es de los siete', () => {
    expect(furnitureLabel('lampara')).toBe('lampara (tipo desconocido)')
  })
})

describe('SAMPLE_ANALYSIS (el análisis de ejemplo)', () => {
  it('cumple el esquema de TP3', () => {
    expect(RoomAnalysisSchema.safeParse(SAMPLE_ANALYSIS).success).toBe(true)
  })

  it('trae una pieza de cada uno de los siete tipos', () => {
    expect(SAMPLE_ANALYSIS.furniture.map((f) => f.type).sort()).toEqual([...FURNITURE_TYPES].sort())
  })

  it('incluye una pieza de confianza baja y un aviso, para ver cómo se comporta cada caso', () => {
    const confidences = SAMPLE_ANALYSIS.furniture.map((f) => f.confidence)
    expect(confidences.filter((c) => c < 0.5)).toHaveLength(1)
    expect(SAMPLE_ANALYSIS.warnings.length).toBeGreaterThanOrEqual(1)
  })
})
