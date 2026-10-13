import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ROOM_WIDTH_M,
  MIN_CONFIDENCE,
  ROOM_DEPTH_RATIO,
  analysisToCluster,
} from '../src/lib/lab/analysis-to-cluster'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import type { DetectedFurniture, RoomAnalysis } from '../src/lib/lab/schema'
import { footprint } from '../src/lib/templates/geometry'

const piece = (over: Partial<DetectedFurniture> = {}): DetectedFurniture => ({
  asset_id: 'sofa',
  x: 0.5,
  y: 0.5,
  width: 0.3,
  depth: 0.2,
  rotation_deg: 0,
  confidence: 0.9,
  ...over,
})
const analysisOf = (...furniture: DetectedFurniture[]): RoomAnalysis => ({ furniture, warnings: [], calibration: { status: 'uncalibrated', width_m: null } })

// Las piezas locales de mentira: lo único que el conversor les pide es su id y su nombre.
const LOCAL: Record<string, { id: string; name: string; dimensions: [number, number, number] }> = {
  sofa: { id: 'sofa', name: 'Sofa', dimensions: [2.06, 0.74, 1.01] },
  'dining-chair': { id: 'dining-chair', name: 'Dining chair', dimensions: [0.47, 0.87, 0.5] },
  'coffee-table': { id: 'coffee-table', name: 'Coffee table', dimensions: [1.72, 0.3, 1.04] },
}
const resolve = (id: string) => LOCAL[id]
const run = (analysis: RoomAnalysis, opts: { knownWidthM?: number | null } = {}) => {
  const warnings: string[] = []
  const pieces = analysisToCluster(analysis, resolve, { ...opts, warn: (m) => warnings.push(m) })
  return { pieces, warnings }
}

describe('analysisToCluster: posiciones', () => {
  it('el ambiente de la foto mide 4 m de ancho y un 75 % de fondo cuando no se sabe su ancho', () => {
    expect(DEFAULT_ROOM_WIDTH_M).toBe(4)
    expect(ROOM_DEPTH_RATIO).toBe(0.75)
    const { pieces } = run(analysisOf(piece({ x: 0.75, y: 0.25 })))
    // x = 0,75 → 0,25 × 4 m a la derecha del centro; y = 0,25 → 0,25 × 3 m hacia arriba (-z)
    expect(pieces).toHaveLength(1)
    expect(pieces[0]?.at).toEqual([1, -0.75])
  })

  it('con el ancho conocido, el ambiente mide ese ancho y el fondo sigue siendo el 75 %', () => {
    const { pieces } = run(analysisOf(piece({ x: 1, y: 1 })), { knownWidthM: 6 })
    expect(pieces[0]?.at).toEqual([3, 2.25])
  })

  it.each([
    ['no se indica', undefined],
    ['es null', null],
    ['es 0', 0],
    ['es negativo', -3],
    ['no es un número', Number.NaN],
    ['es infinito', Number.POSITIVE_INFINITY],
  ])('si el ancho conocido %s, usa los 4 m', (_name, knownWidthM) => {
    const { pieces } = run(analysisOf(piece({ x: 1, y: 0.5 })), { knownWidthM })
    expect(pieces[0]?.at).toEqual([2, 0])
  })

  it('el centro de la foto queda en el centro (0, 0), sin un -0 suelto', () => {
    const at = run(analysisOf(piece())).pieces[0]?.at as [number, number]
    expect(Object.is(at[0], 0)).toBe(true)
    expect(Object.is(at[1], 0)).toBe(true)
  })

  it('en los bordes de la foto, la pieza queda en los bordes del ambiente (x e y de 0 a 1)', () => {
    const corners = run(
      analysisOf(piece({ x: 0, y: 0 }), piece({ x: 1, y: 0 }), piece({ x: 0, y: 1 }), piece({ x: 1, y: 1 })),
    ).pieces.map((p) => p.at)
    expect(corners).toEqual([
      [-2, -1.5],
      [2, -1.5],
      [-2, 1.5],
      [2, 1.5],
    ])
  })

  it('redondea al milímetro (sin ruido de coma flotante)', () => {
    const at = run(analysisOf(piece({ x: 0.58, y: 0.82 }))).pieces[0]?.at
    expect(at).toEqual([0.32, 0.96])
  })

  it('+x va a la derecha y +z hacia abajo: lo de arriba de la foto (y chico) queda en z negativo', () => {
    const { pieces } = run(analysisOf(piece({ y: 0.1 }), piece({ y: 0.9 })))
    expect((pieces[0]?.at[1] ?? 0) < 0).toBe(true)
    expect((pieces[1]?.at[1] ?? 0) > 0).toBe(true)
  })
})

describe('analysisToCluster: tamaño', () => {
  it('el tamaño es siempre el real del catálogo: width y depth de Gemini no cambian nada y la pieza sale tal cual está en el catálogo', () => {
    const small = run(analysisOf(piece({ width: 0.01, depth: 0.01 }))).pieces
    const huge = run(analysisOf(piece({ width: 1, depth: 1 }))).pieces
    expect(small).toEqual(huge)
    expect(small[0]?.asset).toBe(LOCAL.sofa)
    expect(small[0]).not.toHaveProperty('scale')
    expect(small[0]).not.toHaveProperty('size')
  })
})

describe('analysisToCluster: giro', () => {
  // La rotación de TP3 es horaria vista desde arriba; el rotY de Pascal (el de three.js) es antihorario: los signos son opuestos.
  it.each([
    [0, 0],
    [90, -Math.PI / 2],
    [-90, Math.PI / 2],
    [45, -Math.PI / 4],
    [180, -Math.PI],
    [-180, Math.PI],
  ])('un giro horario de %i° es un rotY de %f', (deg, rotY) => {
    expect(run(analysisOf(piece({ rotation_deg: deg }))).pieces[0]?.rotY).toBeCloseTo(rotY, 12)
  })

  it('los giros de más de media vuelta se reducen al giro equivalente más corto', () => {
    expect(run(analysisOf(piece({ rotation_deg: 270 }))).pieces[0]?.rotY).toBeCloseTo(Math.PI / 2, 12)
    expect(run(analysisOf(piece({ rotation_deg: -270 }))).pieces[0]?.rotY).toBeCloseTo(-Math.PI / 2, 12)
    expect(run(analysisOf(piece({ rotation_deg: 360 }))).pieces[0]?.rotY).toBeCloseTo(0, 12)
    expect(run(analysisOf(piece({ rotation_deg: -360 }))).pieces[0]?.rotY).toBeCloseTo(0, 12)
  })

  it('el giro 0 no deja un -0', () => {
    expect(Object.is(run(analysisOf(piece({ rotation_deg: 0 }))).pieces[0]?.rotY, 0)).toBe(true)
    expect(Object.is(run(analysisOf(piece({ rotation_deg: 360 }))).pieces[0]?.rotY, 0)).toBe(true)
  })

  it('con el rotY de Pascal, un giro horario de 90° lleva el lado derecho de la pieza hacia abajo en el plano (+z)', () => {
    // `footprint` usa el mismo rotY que Pascal (x' = cos·x + sin·z, z' = -sin·x + cos·z): la esquina (+x, -z) de la pieza, que
    // arriba a la derecha, tiene que terminar abajo a la derecha tras un giro horario (en el plano +x va a la derecha y +z hacia abajo).
    const rotY = run(analysisOf(piece({ rotation_deg: 90 }))).pieces[0]?.rotY as number
    const [, topRight] = footprint([0, 0], 2, 1, rotY)
    expect(topRight?.[0]).toBeCloseTo(0.5, 6)
    expect(topRight?.[1]).toBeCloseTo(1, 6)
    // y un giro antihorario de 90° (-90 en TP3) la lleva hacia arriba
    const back = run(analysisOf(piece({ rotation_deg: -90 }))).pieces[0]?.rotY as number
    const [, other] = footprint([0, 0], 2, 1, back)
    expect(other?.[0]).toBeCloseTo(-0.5, 6)
    expect(other?.[1]).toBeCloseTo(-1, 6)
  })
})

describe('analysisToCluster: lo que se descarta, siempre con aviso y sin inventar sustitutos', () => {
  it('descarta lo que tiene confianza menor que 0,3 y lo dice con el nombre en castellano', () => {
    expect(MIN_CONFIDENCE).toBe(0.3)
    const { pieces, warnings } = run(analysisOf(piece({ asset_id: 'dining-chair', confidence: 0.29 })))
    expect(pieces).toEqual([])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Silla de comedor')
    expect(warnings[0]).toContain('29 %')
  })

  it('con confianza de 0,3 justo se queda (el corte es estrictamente menor)', () => {
    expect(run(analysisOf(piece({ confidence: 0.3 }))).pieces).toHaveLength(1)
    expect(run(analysisOf(piece({ confidence: 0.3 }))).warnings).toEqual([])
  })

  it('un asset_id que el catálogo local no conoce se descarta con aviso (con el id tal cual) y no se reemplaza por otra pieza', () => {
    const { pieces, warnings } = run(analysisOf(piece({ asset_id: 'lampara-rara' }), piece({ asset_id: 'sofa' })))
    expect(pieces.map((p) => p.asset.id)).toEqual(['sofa'])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('lampara-rara')
    expect(warnings[0]).toMatch(/catálogo/)
  })

  it('una lista vacía da un conjunto vacío y ningún aviso', () => {
    expect(run(analysisOf())).toEqual({ pieces: [], warnings: [] })
  })

  it('si todo se descarta, el conjunto queda vacío y hay un aviso por cada pieza', () => {
    const { pieces, warnings } = run(
      analysisOf(piece({ asset_id: 'inventada' }), piece({ asset_id: 'sofa', confidence: 0.1 }), piece({ asset_id: 'otra-inventada', confidence: 0.05 })),
    )
    expect(pieces).toEqual([])
    expect(warnings).toHaveLength(3)
  })

  it('una pieza desconocida con confianza baja da un solo aviso (el del id desconocido)', () => {
    expect(run(analysisOf(piece({ asset_id: 'inventada', confidence: 0.1 }))).warnings).toHaveLength(1)
  })

  it('sin función de avisos no falla', () => {
    expect(() => analysisToCluster(analysisOf(piece({ asset_id: 'inventada' })), resolve)).not.toThrow()
    expect(analysisToCluster(analysisOf(piece({ asset_id: 'inventada' })), resolve, {})).toEqual([])
  })
})

describe('analysisToCluster: varias piezas', () => {
  it('un mismo mueble repetido (cuatro sillas) da cuatro piezas, una por cada detección y en el mismo orden', () => {
    const chairs = [0.2, 0.4, 0.6, 0.8].map((x) => piece({ asset_id: 'dining-chair', x }))
    const { pieces, warnings } = run(analysisOf(...chairs))
    expect(warnings).toEqual([])
    expect(pieces.map((p) => p.asset.id)).toEqual(['dining-chair', 'dining-chair', 'dining-chair', 'dining-chair'])
    expect(pieces.map((p) => p.at[0])).toEqual([-1.2, -0.4, 0.4, 1.2])
  })

  it('mezcla lo que sirve y lo que no: conserva el orden de lo que se queda', () => {
    const { pieces, warnings } = run(
      analysisOf(piece({ asset_id: 'coffee-table' }), piece({ asset_id: 'inventada' }), piece({ asset_id: 'sofa', confidence: 0.2 }), piece({ asset_id: 'dining-chair' })),
    )
    expect(pieces.map((p) => p.asset.id)).toEqual(['coffee-table', 'dining-chair'])
    expect(warnings).toHaveLength(2)
  })

  it('el análisis de ejemplo da una pieza menos que las que trae: la planta de confianza baja se descarta con aviso', () => {
    const everything = Object.fromEntries(SAMPLE_ANALYSIS.furniture.map((f) => [f.asset_id, { id: f.asset_id, name: f.asset_id }]))
    const warnings: string[] = []
    const pieces = analysisToCluster(SAMPLE_ANALYSIS, (id) => everything[id], { warn: (m) => warnings.push(m) })
    expect(pieces).toHaveLength(SAMPLE_ANALYSIS.furniture.length - 1)
    expect(pieces.map((p) => p.asset.id)).not.toContain('indoor-plant')
    expect(warnings).toHaveLength(1)
  })
})
