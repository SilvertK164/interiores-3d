import { describe, expect, it } from 'vitest'
import { analysisToCluster } from '../src/lib/lab/analysis-to-cluster'
import { MIN_CONFIDENCE } from '../src/lib/lab/layout-constants'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import type { DetectedFurniture } from '../src/lib/lab/schema'
import { dims, piece, planOf, resolve } from './support/layout'

// «Muebles desde una foto»: del plano de Gemini (ya acomodado) a un conjunto de muebles del catálogo local con sus posiciones entre sí. Sin
// el ambiente inventado de 4 m: las posiciones salen del plano en metros, relativas al centro del ambiente de la foto.

const room = { width_m: 3.2, depth_m: 7 }
const run = (furniture: DetectedFurniture[], over: Parameters<typeof planOf>[1] = {}) => {
  const warnings: string[] = []
  const pieces = analysisToCluster(planOf(furniture, { room, ...over }), resolve, { warn: (message) => warnings.push(message) })
  return { pieces, warnings }
}

describe('analysisToCluster: posiciones', () => {
  it('cada pieza va en su centro (x_m, z_m) del plano en metros, relativo al centro del ambiente, con +x al este y +z al sur', () => {
    const { pieces } = run([piece({ asset_id: 'sofa', x_m: 1.6, z_m: 4.9 }), piece({ asset_id: 'bookshelf', x_m: 0.7, z_m: 1 })])
    expect(pieces.map((p) => p.at)).toEqual([
      [0, 1.4], // el centro del ambiente es (1,6; 3,5)
      [-0.9, -2.5],
    ])
  })

  it('no depende de ningún ancho inventado: el mismo mueble en el mismo punto da lo mismo en un ambiente de otro tamaño, salvo por su centro', () => {
    const at = (width_m: number, depth_m: number) => run([piece({ asset_id: 'cactus', x_m: 1.5, z_m: 2 })], { room: { width_m, depth_m } }).pieces[0]?.at
    expect(at(3, 4)).toEqual([0, 0])
    expect(at(5, 6)).toEqual([-1, -1])
  })

  it('redondea al milímetro (sin ruido de coma flotante) y no deja un -0', () => {
    const pieces = run([piece({ asset_id: 'cactus', x_m: 1.6, z_m: 3.5 }), piece({ asset_id: 'cactus', x_m: 1.2345678, z_m: 3.7777777 })]).pieces
    expect(pieces[0]?.at.some((n) => Object.is(n, -0))).toBe(false)
    for (const p of pieces) for (const n of p.at) expect(Math.round(n * 1000) / 1000).toBe(n)
  })

  it('usa las posiciones ya acomodadas: lo que se pasa del ambiente se mete adentro', () => {
    const { pieces } = run([piece({ asset_id: 'bookshelf', x_m: 3.1, z_m: 3.5 })])
    expect(pieces[0]?.at[0]).toBeCloseTo(3.2 - 0.15 - 0.465 - 1.6, 3)
  })
})

describe('analysisToCluster: giro y altura', () => {
  it('el giro horario del plano llega como el rotY de Pascal (antihorario: el signo opuesto), a escuadra', () => {
    const rot = (facing_deg: number) => run([piece({ asset_id: 'floor-lamp', x_m: 1.6, z_m: 3.5, facing_deg })]).pieces[0]?.rotY ?? 99
    expect(rot(0)).toBe(0)
    expect(rot(90)).toBeCloseTo(-Math.PI / 2, 10)
    expect(rot(180)).toBeCloseTo(Math.PI, 10)
    expect(rot(270)).toBeCloseTo(Math.PI / 2, 10)
    expect(Object.is(rot(0), -0)).toBe(false)
  })

  it('con el rotY de Pascal un giro horario de 90° lleva el frente de la pieza hacia el oeste (-x)', () => {
    const rotY = run([piece({ asset_id: 'floor-lamp', x_m: 1.6, z_m: 3.5, facing_deg: 90 })]).pieces[0]?.rotY ?? 0
    expect([Math.round(Math.sin(rotY)) + 0, Math.round(Math.cos(rotY)) + 0]).toEqual([-1, 0])
  })

  it('lo apoyado sobre otra pieza lleva la altura real de su soporte (y), y lo del piso, 0', () => {
    const stand = piece({ asset_id: 'tv-stand', x_m: 1.6, z_m: 0.31, against_wall: 'n' })
    const tv = piece({ asset_id: 'television', x_m: 1.6, z_m: 0.31, on_top_of: 0 })
    const { pieces } = run([stand, tv])
    expect(pieces.map((p) => p.y)).toEqual([0, 0.35])
    expect(pieces[1]?.supportedBy).toBe(0)
    expect(pieces[0]?.supportedBy).toBeNull()
    expect(pieces[1]?.at).toEqual(pieces[0]?.at)
  })

  it('cada pieza trae el tamaño real del catálogo (el del conjunto sale siempre de ahí)', () => {
    const { pieces } = run([piece({ asset_id: 'sofa', x_m: 1.6, z_m: 3.5 })])
    expect((pieces[0]?.asset as unknown as { dimensions: number[] } | undefined)?.dimensions).toEqual(dims('sofa'))
  })
})

describe('analysisToCluster: lo que se descarta, siempre con aviso y sin inventar sustitutos', () => {
  it('descarta lo que tiene confianza menor que 0,3 y lo dice con el nombre en castellano', () => {
    expect(MIN_CONFIDENCE).toBe(0.3)
    const { pieces, warnings } = run([piece({ asset_id: 'indoor-plant', x_m: 1.6, z_m: 3.5, confidence: 0.2 })])
    expect(pieces).toEqual([])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/Planta de interior/)
    expect(warnings[0]).toMatch(/20 %/)
  })

  it('con confianza de 0,3 justo se queda (el corte es estrictamente menor)', () => {
    expect(run([piece({ asset_id: 'cactus', x_m: 1.6, z_m: 3.5, confidence: 0.3 })]).pieces).toHaveLength(1)
  })

  it('un asset_id que el catálogo local no conoce se descarta con aviso (con el id tal cual) y no se reemplaza por otra pieza', () => {
    const { pieces, warnings } = run([piece({ asset_id: 'lampara-rara' })])
    expect(pieces).toEqual([])
    expect(warnings[0]).toMatch(/lampara-rara/)
  })

  it('una lista vacía da un conjunto vacío y ningún aviso; sin función de avisos no falla', () => {
    expect(run([])).toEqual({ pieces: [], warnings: [] })
    expect(() => analysisToCluster(planOf([piece({ asset_id: 'lampara-rara' })]), resolve)).not.toThrow()
  })

  it('si lo que se descarta es el soporte, lo apoyado se descarta con él (no queda una tele flotando)', () => {
    const { pieces, warnings } = run([piece({ asset_id: 'tv-stand', x_m: 1.6, z_m: 0.31, confidence: 0.1 }), piece({ asset_id: 'television', x_m: 1.6, z_m: 0.31, on_top_of: 0 })])
    expect(pieces).toEqual([])
    expect(warnings).toHaveLength(2)
  })
})

describe('analysisToCluster: varias piezas', () => {
  it('un mismo mueble repetido (cuatro sillas) da cuatro piezas, una por cada detección y en el mismo orden', () => {
    const chairs = [0.5, 1.2, 1.9, 2.6].map((x) => piece({ asset_id: 'dining-chair', x_m: x, z_m: 3.5 }))
    const { pieces } = run(chairs)
    expect(pieces).toHaveLength(4)
    expect(pieces.map((p) => p.source)).toEqual([0, 1, 2, 3])
    expect(pieces.map((p) => p.asset.id)).toEqual(['dining-chair', 'dining-chair', 'dining-chair', 'dining-chair'])
  })

  it('mezcla lo que sirve y lo que no: conserva el orden de lo que se queda, con su posición en el plano (source)', () => {
    const { pieces } = run([piece({ asset_id: 'lampara-rara' }), piece({ asset_id: 'cactus', x_m: 1.6, z_m: 3.5 }), piece({ asset_id: 'sofa', confidence: 0.05 }), piece({ asset_id: 'floor-lamp', x_m: 0.5, z_m: 1 })])
    expect(pieces.map((p) => [p.source, p.asset.id])).toEqual([[1, 'cactus'], [3, 'floor-lamp']])
  })

  it('el plano de ejemplo da ocho piezas: la planta de confianza baja se descarta con aviso', () => {
    const warnings: string[] = []
    const pieces = analysisToCluster(SAMPLE_ANALYSIS, resolve, { warn: (message) => warnings.push(message) })
    expect(pieces).toHaveLength(8)
    expect(pieces.map((p) => p.asset.id)).not.toContain('indoor-plant')
    expect(warnings.some((m) => /Planta de interior/.test(m))).toBe(true)
    expect(pieces.find((p) => p.asset.id === 'television')?.y).toBe(0.35)
  })
})
