import { describe, expect, it } from 'vitest'
import { MIN_CONFIDENCE } from '../src/lib/lab/analysis-to-cluster'
import { ANALYSIS_TEXT } from '../src/lib/lab/analysis-text'
import {
  calibrationText,
  confidenceLevel,
  detailLines,
  originText,
  percent,
  pieceCountLabel,
  positionText,
  rotationText,
  sizeText,
} from '../src/lib/lab/lab-view'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'

describe('percent', () => {
  it('redondea una proporción a porcentaje entero con un espacio antes del %', () => {
    expect(percent(0)).toBe('0 %')
    expect(percent(0.2)).toBe('20 %')
    expect(percent(0.876)).toBe('88 %')
    expect(percent(1)).toBe('100 %')
  })
})

describe('pieceCountLabel', () => {
  it('singular y plural', () => {
    expect(pieceCountLabel(0)).toBe('0 piezas')
    expect(pieceCountLabel(1)).toBe('1 pieza')
    expect(pieceCountLabel(7)).toBe('7 piezas')
  })
})

describe('confidenceLevel', () => {
  it('es baja por debajo del umbral con el que «Muebles desde una foto» descarta una pieza', () => {
    expect(MIN_CONFIDENCE).toBe(0.3)
    expect(confidenceLevel(0.29)).toBe('low')
    expect(confidenceLevel(0)).toBe('low')
    expect(confidenceLevel(0.3)).toBe('ok')
    expect(confidenceLevel(0.92)).toBe('ok')
  })
})

describe('lo que dice la tabla de piezas', () => {
  const sofa = SAMPLE_ANALYSIS.furniture[2]
  if (!sofa) throw new Error('el ejemplo ya no trae el sofá')

  it('la posición del centro, el tamaño estimado y el giro, en porcentajes del ambiente', () => {
    expect(positionText(sofa)).toBe('58 % del ancho · 82 % del fondo')
    expect(sizeText(sofa)).toBe('34 % × 18 %')
    expect(rotationText(sofa)).toBe('0°')
    expect(rotationText({ ...sofa, rotation_deg: -89.6 })).toBe('-90°')
    expect(rotationText({ ...sofa, rotation_deg: 180 })).toBe('180°')
  })

  it('con poco ancho el detalle va en dos líneas con sus rótulos (la tabla de cinco columnas no cabe)', () => {
    expect(detailLines(sofa)).toEqual(['Centro: 58 % del ancho · 82 % del fondo', 'Tamaño: 34 % × 18 % · Giro: 0°'])
  })
})

describe('origen y calibración del análisis', () => {
  it('dice de dónde viene: de la foto o del ejemplo', () => {
    expect(originText(false)).toBe('Respuesta del análisis de tu foto.')
    expect(originText(true)).toBe('Análisis de ejemplo: no viene de una foto.')
  })

  it('con el ancho conocido lo repite en metros con coma; sin él avisa que las medidas son proporciones', () => {
    expect(calibrationText({ status: 'user_provided', width_m: 4.5 })).toBe('Ancho conocido: 4,5 m.')
    expect(calibrationText({ status: 'user_provided', width_m: 4.256 })).toBe('Ancho conocido: 4,26 m.')
    expect(calibrationText({ status: 'uncalibrated', width_m: null })).toBe('Sin ancho conocido: las medidas son proporciones del ambiente.')
    expect(calibrationText({ status: 'user_provided', width_m: null })).toBe('Sin ancho conocido: las medidas son proporciones del ambiente.')
  })
})

describe('ANALYSIS_TEXT: el aviso de privacidad es el mismo en el diálogo del editor y en /laboratorio', () => {
  it('dice a dónde va la foto, que no se guarda y que Google puede usarla en el nivel gratuito', () => {
    expect(ANALYSIS_TEXT.privacy).toMatch(/Google \(Gemini\)/)
    expect(ANALYSIS_TEXT.privacy).toMatch(/no la guardamos/)
    expect(ANALYSIS_TEXT.privacy).toMatch(/nivel gratuito/)
    expect(ANALYSIS_TEXT.privacy).toMatch(/Google puede usar las fotos para mejorar sus productos/)
    expect(ANALYSIS_TEXT.privacy).toMatch(/evita las privadas/)
    expect(ANALYSIS_TEXT.limit).toBe('Puedes analizar hasta 10 fotos por hora.')
  })

  it('no menciona TP3 ni lenguaje técnico', () => {
    for (const text of Object.values(ANALYSIS_TEXT)) expect(text).not.toMatch(/TP3|API|JSON|servicio/i)
  })
})
