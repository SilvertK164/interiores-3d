import { describe, expect, it } from 'vitest'
import { ANALYSIS_TEXT } from '../src/lib/lab/analysis-text'
import type { AnalysisCandidate } from '../src/lib/lab/analysis-catalog'
import { MIN_CONFIDENCE } from '../src/lib/lab/layout-constants'
import {
  cameraText,
  compassName,
  confidenceLevel,
  detailLines,
  facingText,
  originText,
  percent,
  pieceCountLabel,
  openingsText,
  placementLines,
  positionLines,
  positionText,
  roomText,
  showEditorPathTool,
} from '../src/lib/lab/lab-view'
import type { DetectedFurniture, RoomOpening } from '../src/lib/lab/schema'

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

const piece = (over: Partial<DetectedFurniture> = {}): DetectedFurniture => ({
  asset_id: 'sofa',
  x_m: 1.6,
  z_m: 4.5,
  facing_deg: 180,
  against_wall: null,
  on_top_of: null,
  confidence: 0.92,
  ...over,
})
const CANDIDATES: AnalysisCandidate[] = [
  { id: 'sofa', name: 'Sofá', category: 'seating', tags: [] },
  { id: 'tv-stand', name: 'Mueble de TV', category: 'storage', tags: [] },
  { id: 'television', name: 'Televisor', category: 'electronics', tags: [] },
]

describe('compassName: hacia dónde mira una pieza, en castellano', () => {
  it('0° es el sur y el giro es horario visto desde arriba: 90° oeste, 180° norte, 270° este', () => {
    expect([0, 90, 180, 270].map(compassName)).toEqual(['sur', 'oeste', 'norte', 'este'])
  })

  it('las diagonales llevan su nombre y un giro cercano se redondea al punto más próximo (cada 45°)', () => {
    expect([45, 135, 225, 315].map(compassName)).toEqual(['suroeste', 'noroeste', 'noreste', 'sureste'])
    expect([20, 100, 170, 350, -90, 360, 450].map(compassName)).toEqual(['sur', 'oeste', 'norte', 'sur', 'este', 'sur', 'oeste'])
  })
})

describe('lo que dice la tabla de piezas', () => {
  it('la posición del centro va en metros desde los muros oeste y norte, con coma decimal', () => {
    expect(positionText(piece())).toBe('1,6 m del muro oeste · 4,5 m del muro norte')
    expect(positionText(piece({ x_m: 0.254, z_m: 12 }))).toBe('0,25 m del muro oeste · 12 m del muro norte')
  })

  it('la posición también sale en dos líneas (hacia el oeste y hacia el norte) para las columnas de la tabla', () => {
    expect(positionLines(piece())).toEqual(['1,6 m del muro oeste', '4,5 m del muro norte'])
    expect(positionLines(piece()).join(' · ')).toBe(positionText(piece()))
  })

  it('hacia dónde mira, en castellano: «mira al sur»', () => {
    expect(facingText(piece({ facing_deg: 0 }))).toBe('mira al sur')
    expect(facingText(piece({ facing_deg: 180 }))).toBe('mira al norte')
    expect(facingText(piece({ facing_deg: 270 }))).toBe('mira al este')
    expect(facingText(piece({ facing_deg: 135 }))).toBe('mira al noroeste')
  })

  it('la ubicación junta cómo mira, contra qué muro está («contra el muro norte») y sobre qué se apoya', () => {
    expect(placementLines(piece(), [piece()], CANDIDATES)).toEqual(['mira al norte'])
    expect(placementLines(piece({ against_wall: 'n', facing_deg: 0 }), [piece()], CANDIDATES)).toEqual(['mira al sur', 'contra el muro norte'])
    for (const [wall, name] of [['s', 'sur'], ['e', 'este'], ['w', 'oeste']] as const) {
      expect(placementLines(piece({ against_wall: wall }), [], CANDIDATES)).toContain(`contra el muro ${name}`)
    }
    const furniture = [piece({ asset_id: 'tv-stand', against_wall: 'n', facing_deg: 0 }), piece({ asset_id: 'television', on_top_of: 0, facing_deg: 0 })]
    expect(placementLines(furniture[1] as DetectedFurniture, furniture, CANDIDATES)).toEqual(['mira al sur', 'sobre «Mueble de TV»'])
  })

  it('si el soporte no está en el catálogo enviado lo dice con su id, y un índice que no existe se ignora', () => {
    const furniture = [piece({ asset_id: 'lampara-rara' }), piece({ asset_id: 'sofa', on_top_of: 0 })]
    expect(placementLines(furniture[1] as DetectedFurniture, furniture, CANDIDATES)).toEqual(['mira al norte', 'sobre «lampara-rara (no está en el catálogo)»'])
    expect(placementLines(piece({ on_top_of: 9 }), [], CANDIDATES)).toEqual(['mira al norte'])
  })

  it('con poco ancho el detalle va en dos líneas con sus rótulos (la tabla de cuatro columnas no cabe)', () => {
    expect(detailLines(piece({ against_wall: 's' }), [], CANDIDATES)).toEqual(['Centro: 1,6 m del muro oeste · 4,5 m del muro norte', 'Ubicación: mira al norte · contra el muro sur'])
  })
})

describe('el ambiente y la cámara del plano', () => {
  it('el tamaño del ambiente en metros, ancho por fondo', () => {
    expect(roomText({ width_m: 3.2, depth_m: 7 })).toBe('Ambiente de 3,2 × 7 m (ancho × fondo)')
    expect(roomText({ width_m: 4.256, depth_m: 3 })).toBe('Ambiente de 4,26 × 3 m (ancho × fondo)')
  })

  it('desde dónde se tomó la foto y hacia dónde mira, con el rumbo en castellano', () => {
    expect(cameraText({ x_m: 1.6, z_m: 6.8, look_at: { x_m: 1.6, z_m: 0 } })).toBe('Foto tomada a 1,6 m del muro oeste y 6,8 m del muro norte, mirando hacia el norte.')
    expect(cameraText({ x_m: 4, z_m: 3, look_at: { x_m: 0, z_m: 0 } })).toBe('Foto tomada a 4 m del muro oeste y 3 m del muro norte, mirando hacia el noroeste.')
    expect(cameraText({ x_m: 0.4, z_m: 2, look_at: { x_m: 4, z_m: 2 } })).toContain('mirando hacia el este')
  })
})

describe('las puertas y ventanas del plano', () => {
  const open = (type: RoomOpening['type'], wall: RoomOpening['wall']): RoomOpening => ({ type, wall, at_m: 1, width_m: 1 })

  it('lista cada abertura con su muro, en castellano', () => {
    expect(openingsText([open('door', 's'), open('window', 'e')])).toBe('Aberturas: puerta en el muro sur, ventana en el muro este.')
    expect(openingsText([open('window', 'n')])).toBe('Aberturas: ventana en el muro norte.')
  })

  it('sin aberturas lo dice', () => {
    expect(openingsText([])).toBe('No se detectaron puertas ni ventanas.')
  })
})

describe('origen del análisis', () => {
  it('dice de dónde viene: de la foto o del ejemplo', () => {
    expect(originText(false)).toBe('Respuesta del análisis de tu foto.')
    expect(originText(true)).toBe('Análisis de ejemplo: no viene de una foto.')
  })
})

describe('ANALYSIS_TEXT: el aviso de privacidad es el mismo en el diálogo del editor y en /escena-desde-foto', () => {
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

describe('showEditorPathTool: «Comprobar que el camino al editor funciona» no se ve en producción', () => {
  it('en desarrollo y en las pruebas se muestra', () => {
    expect(showEditorPathTool({ nodeEnv: 'development' })).toBe(true)
    expect(showEditorPathTool({ nodeEnv: 'test' })).toBe(true)
    expect(showEditorPathTool({ nodeEnv: undefined })).toBe(true)
  })

  it('en producción se oculta', () => {
    expect(showEditorPathTool({ nodeEnv: 'production' })).toBe(false)
    expect(showEditorPathTool({ nodeEnv: 'production', e2e: '0' })).toBe(false)
    expect(showEditorPathTool({ nodeEnv: 'production', e2e: '' })).toBe(false)
  })

  it('con NEXT_PUBLIC_E2E=1 se muestra también en una compilación de producción (las pruebas en navegador)', () => {
    expect(showEditorPathTool({ nodeEnv: 'production', e2e: '1' })).toBe(true)
  })
})
