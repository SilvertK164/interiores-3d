import { describe, expect, it } from 'vitest'
import { EDGE_M, MIN_CONFIDENCE, solveLayout } from '../src/lib/lab/layout-solver'
import { piece, planOf, resolve } from './support/layout'

// El acomodador (`solveLayout`): recibe el plano de Gemini y el catálogo con sus medidas reales y lo corrige. Todo en metros, con el origen
// en la esquina noroeste (x al este, z al sur) y `facing_deg` = 0 cuando el frente mira al sur, giro horario visto desde arriba.
// Las piezas son las reales del catálogo local: sofá 2,06 × 1,01, mesa de centro 1,72 × 1,04, mueble de TV 1,86 × 0,32 (alto 0,35)…

const solve = (...args: Parameters<typeof planOf>) => solveLayout(planOf(...args), resolve)
const first = (result: ReturnType<typeof solve>, id?: string) => {
  const found = id ? result.pieces.find((p) => p.asset.id === id) : result.pieces[0]
  if (!found) throw new Error(`no hay ${id ?? 'ninguna pieza'} en el resultado`)
  return found
}

describe('solveLayout: el ambiente', () => {
  it('devuelve el ambiente del plano al milímetro, con la cámara tal cual', () => {
    const analysis = planOf([], { room: { width_m: 3.2, depth_m: 7.0004 } })
    const result = solveLayout(analysis, resolve)
    expect(result.room).toEqual({ width: 3.2, depth: 7 })
    expect(result.camera).toEqual(analysis.camera)
  })

  it('el margen contra los muros es 0,15 m: la cara interior del muro (0,1 m desde el eje) y 0,05 m de holgura', () => {
    expect(EDGE_M).toBeCloseTo(0.15, 10)
  })

  it('recorta el ambiente a límites razonables (de 1,5 a 12 m por lado) y lo avisa', () => {
    const wide = solveLayout({ ...planOf([]), room: { width_m: 20, depth_m: 1 } } as never, resolve)
    expect(wide.room).toEqual({ width: 12, depth: 1.5 })
    expect(wide.warnings.some((w) => /ambiente/i.test(w) && /12/.test(w))).toBe(true)
  })

  it('un plano sin muebles ni aberturas da un resultado vacío y sin avisos', () => {
    const result = solve([])
    expect(result.pieces).toEqual([])
    expect(result.openings).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('no modifica el plano que recibe', () => {
    const analysis = planOf([piece({ against_wall: 's', z_m: 1 }), piece({ asset_id: 'television', on_top_of: 0 })])
    const copy = JSON.parse(JSON.stringify(analysis))
    solveLayout(analysis, resolve)
    expect(analysis).toEqual(copy)
  })

  it('es determinista: el mismo plano da siempre el mismo resultado', () => {
    const analysis = planOf([piece(), piece({ asset_id: 'coffee-table', x_m: 2.1, z_m: 2.1, confidence: 0.5 }), piece({ asset_id: 'bookshelf', x_m: 2, z_m: 2, confidence: 0.4 })])
    const a = solveLayout(analysis, resolve)
    const b = solveLayout(analysis, resolve)
    expect(a).toEqual(b)
  })
})

describe('solveLayout: lo que se descarta, siempre con aviso y sin inventar sustitutos', () => {
  it('descarta lo que tiene confianza menor que 0,3 y lo dice con el nombre en castellano', () => {
    expect(MIN_CONFIDENCE).toBe(0.3)
    const result = solve([piece({ asset_id: 'indoor-plant', confidence: 0.2 }), piece({ asset_id: 'sofa', confidence: 0.3 })])
    expect(result.pieces.map((p) => p.asset.id)).toEqual(['sofa'])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/Planta de interior/)
    expect(result.warnings[0]).toMatch(/20 %/)
  })

  it('un asset_id que el catálogo local no conoce se descarta con el id tal cual y sin reemplazarlo por otra pieza', () => {
    const result = solve([piece({ asset_id: 'lampara-rara' })])
    expect(result.pieces).toEqual([])
    expect(result.warnings[0]).toMatch(/lampara-rara/)
    expect(result.warnings[0]).toMatch(/catálogo/)
  })

  it('una pieza desconocida con confianza baja da un solo aviso (el del id desconocido)', () => {
    expect(solve([piece({ asset_id: 'lampara-rara', confidence: 0.1 })]).warnings).toHaveLength(1)
  })

  it('un mismo mueble repetido (cuatro sillas) da cuatro piezas, una por cada detección y en el mismo orden', () => {
    const chairs = [0.5, 1.5, 2.5, 3.5].map((x) => piece({ asset_id: 'dining-chair', x_m: x, z_m: 1.5 }))
    const result = solve(chairs, { room: { width_m: 5, depth_m: 3 } })
    expect(result.pieces).toHaveLength(4)
    expect(result.pieces.map((p) => p.source)).toEqual([0, 1, 2, 3])
  })

  it('cada pieza recuerda su posición en el plano (source), aunque se hayan descartado otras', () => {
    const result = solve([piece({ asset_id: 'lampara-rara' }), piece({ asset_id: 'sofa', x_m: 2, z_m: 1.5 })])
    expect(result.pieces.map((p) => p.source)).toEqual([1])
  })
})

describe('solveLayout: el giro', () => {
  it('lleva el giro a [0, 360) y las piezas a su rotY de Pascal (antihorario: el signo opuesto)', () => {
    const rot = (facing: number) => first(solve([piece({ facing_deg: facing, x_m: 2, z_m: 1.5 })]))
    expect(rot(90).facingDeg).toBe(90)
    expect(rot(90).rotY).toBeCloseTo(-Math.PI / 2, 10)
    expect(rot(-90).facingDeg).toBe(270)
    expect(rot(270).rotY).toBeCloseTo(Math.PI / 2, 10)
    expect(rot(180).rotY).toBeCloseTo(Math.PI, 10)
    expect(rot(360).facingDeg).toBe(0)
  })

  it('el giro 0 no deja un -0 suelto', () => {
    const turned = first(solve([piece({ facing_deg: 0, x_m: 2, z_m: 1.5 })]))
    expect(Object.is(turned.rotY, 0)).toBe(true)
    expect(Object.is(turned.facingDeg, 0)).toBe(true)
  })

  it('con el rotY de Pascal el frente (sin θ, cos θ) apunta a donde dice facing_deg: 0 al sur (+z), 90 al oeste (-x), 180 al norte (-z), 270 al este (+x)', () => {
    const front = (facing: number) => {
      const { rotY } = first(solve([piece({ facing_deg: facing, x_m: 2, z_m: 1.5 })]))
      return [Math.round(Math.sin(rotY)) + 0, Math.round(Math.cos(rotY)) + 0]
    }
    expect(front(0)).toEqual([0, 1])
    expect(front(90)).toEqual([-1, 0])
    expect(front(180)).toEqual([0, -1])
    expect(front(270)).toEqual([1, 0])
  })

  it('un giro a menos de 10° de un ángulo recto se endereza (los muebles de una casa están a escuadra); uno más torcido se respeta', () => {
    const face = (facing: number) => first(solve([piece({ asset_id: 'floor-lamp', facing_deg: facing, x_m: 2, z_m: 1.5 })])).facingDeg
    expect(face(87)).toBe(90)
    expect(face(93)).toBe(90)
    expect(face(181)).toBe(180)
    expect(face(-5)).toBe(0)
    expect(face(45)).toBe(45)
    expect(face(100)).toBe(100)
  })

  it('trae las medidas reales del catálogo: el ancho y el fondo de Gemini ya no existen', () => {
    const sofa = first(solve([piece()]))
    expect([sofa.width, sofa.height, sofa.depth]).toEqual([2.06, 0.74, 1.01])
    expect(sofa.asset.id).toBe('sofa')
  })
})

describe('solveLayout: lo que está contra un muro (against_wall)', () => {
  const against = (wall: 'n' | 's' | 'e' | 'w', over: Parameters<typeof piece>[0] = {}) =>
    first(solve([piece({ against_wall: wall, x_m: 2, z_m: 1.5, ...over })]))

  it('se pega al muro con 0,05 m de holgura sobre su cara (0,15 m del borde del rectángulo) y mira hacia el interior', () => {
    const north = against('n')
    expect([north.x, north.z, north.facingDeg]).toEqual([2, 0.655, 0])
    const south = against('s')
    expect([south.x, south.z, south.facingDeg]).toEqual([2, 2.345, 180])
    const east = against('e')
    expect([east.x, east.z, east.facingDeg]).toEqual([3.345, 1.5, 90])
    const west = against('w')
    expect([west.x, west.z, west.facingDeg]).toEqual([0.655, 1.5, 270])
  })

  it('aunque Gemini lo haya dado lejos del muro o mirando para otro lado', () => {
    const far = against('s', { z_m: 0.6, facing_deg: 90 })
    expect([far.z, far.facingDeg]).toEqual([2.345, 180])
  })

  it('a lo largo del muro se queda donde estaba, pero sin salirse del ambiente', () => {
    const shelf = (x: number) => first(solve([piece({ asset_id: 'bookshelf', against_wall: 'n', x_m: x, z_m: 0.4 })]))
    expect(shelf(2).x).toBe(2)
    expect(shelf(3.95).x).toBeCloseTo(4 - EDGE_M - 0.465, 3)
    expect(shelf(0.1).x).toBeCloseTo(EDGE_M + 0.465, 3)
  })

  it('avisa con el nombre de la pieza y el muro cuando la movió mucho, y calla lo menor (la foto no es tan precisa)', () => {
    const moved = solve([piece({ against_wall: 's', x_m: 2, z_m: 1 })])
    expect(moved.warnings).toHaveLength(1)
    expect(moved.warnings[0]).toMatch(/Sofá/)
    expect(moved.warnings[0]).toMatch(/muro sur/)
    const near = solve([piece({ against_wall: 's', x_m: 2, z_m: 2.25 })])
    expect(near.warnings).toEqual([])
  })

  it('la pieza queda anotada con su muro (against_wall) para los que vienen después', () => {
    expect(against('e').againstWall).toBe('e')
    expect(first(solve([piece()])).againstWall).toBeNull()
  })
})

describe('solveLayout: los asientos miran hacia su foco', () => {
  const stand = piece({ asset_id: 'tv-stand', x_m: 2, z_m: 0.31, against_wall: 'n', facing_deg: 0 })
  const tv = piece({ asset_id: 'television', x_m: 2, z_m: 0.31, on_top_of: 0, facing_deg: 0 })

  it('un sofá que le da la espalda a la tele se gira hacia ella', () => {
    const result = solve([stand, tv, piece({ asset_id: 'sofa', x_m: 2, z_m: 2.2, facing_deg: 0 })])
    expect(first(result, 'sofa').facingDeg).toBe(180)
  })

  it('si ya mira hacia el foco (a menos de 45°) no se toca', () => {
    const result = solve([stand, tv, piece({ asset_id: 'sofa', x_m: 2, z_m: 2.2, facing_deg: 160 })])
    expect(first(result, 'sofa').facingDeg).toBe(160)
  })

  it('con la mesa de centro como foco más cercano: una butaca al este de la mesa mira al oeste', () => {
    const table = piece({ asset_id: 'coffee-table', x_m: 1.5, z_m: 1.6 })
    const chair = piece({ asset_id: 'livingroom-chair', x_m: 3.1, z_m: 1.6, facing_deg: 270 })
    expect(first(solve([stand, tv, table, chair], { room: { width_m: 4.2, depth_m: 3 } }), 'livingroom-chair').facingDeg).toBe(90)
  })

  it('elige el foco más cercano (la mesa, no la tele que está lejos)', () => {
    const table = piece({ asset_id: 'coffee-table', x_m: 2, z_m: 3.6 })
    const chair = piece({ asset_id: 'lounge-chair', x_m: 2, z_m: 5.2, facing_deg: 0 })
    const result = solve([stand, tv, table, chair], { room: { width_m: 4, depth_m: 6 } })
    expect(first(result, 'lounge-chair').facingDeg).toBe(180)
  })

  it('las sillas de comedor miran a la mesa de comedor desde cualquier lado', () => {
    const table = piece({ asset_id: 'dining-table', x_m: 3, z_m: 2.5, facing_deg: 0 })
    const chairs = [
      piece({ asset_id: 'dining-chair', x_m: 3, z_m: 1.55, facing_deg: 0 }), // al norte de la mesa
      piece({ asset_id: 'dining-chair', x_m: 3, z_m: 3.45, facing_deg: 180 }), // al sur
      piece({ asset_id: 'dining-chair', x_m: 1.6, z_m: 2.5, facing_deg: 0 }), // al oeste
      piece({ asset_id: 'dining-chair', x_m: 4.4, z_m: 2.5, facing_deg: 0 }), // al este
    ]
    const result = solve([table, ...chairs], { room: { width_m: 6, depth_m: 5 } })
    expect(result.pieces.filter((p) => p.asset.id === 'dining-chair').map((p) => p.facingDeg)).toEqual([0, 180, 270, 90])
  })

  it('una silla de escritorio mira al escritorio', () => {
    const desk = piece({ asset_id: 'office-table', x_m: 2, z_m: 0.5, against_wall: 'n' })
    const chair = piece({ asset_id: 'office-chair', x_m: 2, z_m: 1.3, facing_deg: 0 })
    expect(first(solve([desk, chair]), 'office-chair').facingDeg).toBe(180)
  })

  it('un asiento pegado a un muro conserva su giro hacia el interior: el foco no lo desvía', () => {
    const sofa = piece({ asset_id: 'sofa', x_m: 2, z_m: 2.4, against_wall: 's', facing_deg: 180 })
    const lateral = piece({ asset_id: 'television', x_m: 3.3, z_m: 0.5, facing_deg: 0 })
    expect(first(solve([sofa, lateral]), 'sofa').facingDeg).toBe(180)
  })

  it('sin ninguna tele ni mesa en el plano, los asientos conservan el giro que dio Gemini', () => {
    const chair = piece({ asset_id: 'livingroom-chair', x_m: 2, z_m: 1.5, facing_deg: 30 })
    expect(first(solve([chair])).facingDeg).toBe(30)
  })

  it('una pieza que no es un asiento no se gira hacia nada', () => {
    const shelf = piece({ asset_id: 'bookshelf', x_m: 2, z_m: 1.5, facing_deg: 0 })
    const table = piece({ asset_id: 'coffee-table', x_m: 2, z_m: 0.6 })
    expect(first(solve([shelf, table]), 'bookshelf').facingDeg).toBe(0)
  })
})
