import type { RoomAnalysis } from './schema'

/**
 * Un análisis fijo con el mismo formato que devuelve TP3: una pieza de cada uno de los siete tipos, una de ellas con
 * confianza baja (la planta) y un aviso. Sirve para probar el modelado sin servicio, sin clave de Gemini y sin cuota,
 * y es el mismo que usan las pruebas.
 */
export const SAMPLE_ANALYSIS: RoomAnalysis = {
  furniture: [
    { type: 'tv', x: 0.5, y: 0.07, width: 0.3, depth: 0.06, rotation_deg: 180, confidence: 0.9 },
    { type: 'mesa', x: 0.5, y: 0.5, width: 0.3, depth: 0.22, rotation_deg: 0, confidence: 0.88 },
    { type: 'sofa', x: 0.58, y: 0.82, width: 0.34, depth: 0.18, rotation_deg: 0, confidence: 0.92 },
    { type: 'silla', x: 0.28, y: 0.5, width: 0.1, depth: 0.12, rotation_deg: 90, confidence: 0.76 },
    { type: 'estante', x: 0.94, y: 0.35, width: 0.3, depth: 0.07, rotation_deg: 90, confidence: 0.81 },
    { type: 'cama', x: 0.16, y: 0.78, width: 0.3, depth: 0.4, rotation_deg: 180, confidence: 0.85 },
    { type: 'planta', x: 0.92, y: 0.9, width: 0.08, depth: 0.1, rotation_deg: 0, confidence: 0.2 },
  ],
  warnings: ['La planta está parcialmente tapada por el sofá: su posición es aproximada.'],
  calibration: { status: 'uncalibrated', width_m: null },
}
