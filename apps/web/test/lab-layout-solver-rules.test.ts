import { describe, expect, it } from 'vitest'
import { solveLayout } from '../src/lib/lab/layout-solver'
import { boxOf, opening, overlaps, piece, planOf, resolve } from './support/layout'

// Lo que el acomodador hace con las piezas apoyadas (on_top_of), los solapes, lo que se sale del ambiente y las puertas y ventanas.
// Medidas reales: mueble de TV 1,86 × 0,35 × 0,32; tele 1,62 × 1,07 × 0,38; mesa de centro 1,72 × 0,30 × 1,04; alfombra 2,78 × 0,04 × 1,81.

const solve = (...args: Parameters<typeof planOf>) => solveLayout(planOf(...args), resolve)
type Result = ReturnType<typeof solve>
const first = (result: Result, id: string) => {
  const found = result.pieces.find((p) => p.asset.id === id)
  if (!found) throw new Error(`no hay ${id} en el resultado`)
  return found
}
const boxFor = (p: Result['pieces'][number]) => boxOf(p.asset.id, p.x, p.z, p.facingDeg)

describe('solveLayout: lo que está apoyado sobre otro mueble (on_top_of)', () => {
  const stand = piece({ asset_id: 'tv-stand', x_m: 2, z_m: 0.31, against_wall: 'n', facing_deg: 0 })

  it('sube a la altura real del soporte: la tele queda sobre el mueble (0,35 m)', () => {
    const result = solve([stand, piece({ asset_id: 'television', x_m: 2, z_m: 0.31, on_top_of: 0 })])
    const tv = first(result, 'television')
    expect(tv.y).toBe(0.35)
    expect(first(result, 'tv-stand').y).toBe(0)
    expect(result.pieces[tv.supportedBy as number]?.asset.id).toBe('tv-stand')
  })

  it('su centro cae dentro de la huella del soporte: lo que se desvía de más se acerca (la tele cabe 0,12 m hacia cada lado)', () => {
    const tv = (x: number) => first(solve([stand, piece({ asset_id: 'television', x_m: x, z_m: 0.9, on_top_of: 0 })]), 'television')
    expect(tv(2).x).toBe(2)
    expect(tv(3).x).toBeCloseTo(2.12, 3)
    expect(tv(0.5).x).toBeCloseTo(1.88, 3)
    expect(tv(2).z).toBeCloseTo(first(solve([stand]), 'tv-stand').z, 3) // más honda que el soporte: queda centrada
  })

  it('hereda el giro del soporte si Gemini lo dio al revés (una tele mira para donde mira su mueble)', () => {
    const tv = first(solve([stand, piece({ asset_id: 'television', x_m: 2, z_m: 0.31, on_top_of: 0, facing_deg: 180 })]), 'television')
    expect(tv.facingDeg).toBe(0)
  })

  it('acompaña al soporte cuando este se mueve: si el mueble se pega al muro, la tele va con él', () => {
    const away = piece({ asset_id: 'tv-stand', x_m: 2, z_m: 1.2, against_wall: 'n' })
    const result = solve([away, piece({ asset_id: 'television', x_m: 2, z_m: 1.2, on_top_of: 0 })])
    expect(first(result, 'television').z).toBeCloseTo(first(result, 'tv-stand').z, 3)
    expect(first(result, 'tv-stand').z).toBeCloseTo(0.31, 3)
  })

  it('las cadenas suman alturas: cactus sobre mesa sobre alfombra (0,04 + 0,30)', () => {
    const rug = piece({ asset_id: 'rectangular-carpet', x_m: 2, z_m: 1.5 })
    const table = piece({ asset_id: 'coffee-table', x_m: 2, z_m: 1.5, on_top_of: 0 })
    const cactus = piece({ asset_id: 'cactus', x_m: 2, z_m: 1.5, on_top_of: 1 })
    const result = solve([rug, table, cactus], { room: { width_m: 4, depth_m: 3 } })
    expect(first(result, 'coffee-table').y).toBe(0.04)
    expect(first(result, 'cactus').y).toBe(0.34)
  })

  it('el soporte puede venir después de lo apoyado en la lista', () => {
    const result = solve([piece({ asset_id: 'television', x_m: 2, z_m: 0.31, on_top_of: 1 }), stand])
    expect(first(result, 'television').y).toBe(0.35)
  })

  it('no participa de los solapes: no empuja ni la empujan, aunque la tele pise el mueble', () => {
    const result = solve([stand, piece({ asset_id: 'television', x_m: 2, z_m: 0.31, on_top_of: 0, confidence: 0.9 })])
    expect(first(result, 'television').x).toBe(first(result, 'tv-stand').x)
    expect(result.warnings).toEqual([])
  })

  it('si el soporte se descarta (confianza baja), lo apoyado también, con aviso: no deja una tele en el piso', () => {
    const result = solve([{ ...stand, confidence: 0.1 }, piece({ asset_id: 'television', x_m: 2, z_m: 0.31, on_top_of: 0 })])
    expect(result.pieces).toEqual([])
    expect(result.warnings.some((w) => /Televisor/.test(w) && /apoyad/.test(w))).toBe(true)
  })

  it('no se apoya nada sobre algo de más de 1,4 m (una biblioteca): queda en el piso, con aviso', () => {
    const result = solve([piece({ asset_id: 'bookshelf', x_m: 2, z_m: 0.5, against_wall: 'n' }), piece({ asset_id: 'cactus', x_m: 2.1, z_m: 1.5, on_top_of: 0 })])
    const cactus = first(result, 'cactus')
    expect(cactus.y).toBe(0)
    expect(cactus.supportedBy).toBeNull()
    expect(result.warnings.some((w) => /Cactus/.test(w) && /Biblioteca/.test(w))).toBe(true)
  })

  it('un ciclo (que el contrato ya rechaza) no cuelga al acomodador: las dos quedan en el piso', () => {
    const cyclic = planOf([piece({ asset_id: 'coffee-table', x_m: 1, z_m: 1.5, on_top_of: 1 }), piece({ asset_id: 'sofa', x_m: 3, z_m: 1.5, on_top_of: 0 })])
    const result = solveLayout(cyclic, resolve)
    expect(result.pieces.map((p) => p.y)).toEqual([0, 0])
  })
})

describe('solveLayout: separa lo que se solapa', () => {
  const room = { width_m: 6, depth_m: 5 }

  it('empuja la pieza de menor confianza por el eje de menor solape y deja quieta la otra', () => {
    const keep = piece({ asset_id: 'sofa', x_m: 3, z_m: 2.5, confidence: 0.9 })
    const moved = piece({ asset_id: 'sofa', x_m: 3.4, z_m: 3, confidence: 0.5 })
    const result = solve([keep, moved], { room })
    const [a, b] = result.pieces
    expect([a?.x, a?.z]).toEqual([3, 2.5])
    expect(b?.x).toBe(3.4)
    expect(b?.z).toBeCloseTo(3.52, 2) // el solape menor era el de z (0,51 m)
  })

  it('si la de menor confianza va primero en la lista, igual es la que se mueve', () => {
    const moved = piece({ asset_id: 'sofa', x_m: 3.4, z_m: 3, confidence: 0.5 })
    const keep = piece({ asset_id: 'sofa', x_m: 3, z_m: 2.5, confidence: 0.9 })
    const [a, b] = solve([moved, keep], { room }).pieces
    expect([b?.x, b?.z]).toEqual([3, 2.5])
    expect(a?.z).toBeCloseTo(3.52, 2)
  })

  it('después de separar no queda ningún solape y todo sigue dentro del ambiente', () => {
    const crowd = [
      piece({ asset_id: 'sofa', x_m: 3, z_m: 2.5, confidence: 0.9 }),
      piece({ asset_id: 'livingroom-chair', x_m: 3.5, z_m: 2.7, confidence: 0.7 }),
      piece({ asset_id: 'bookshelf', x_m: 3.2, z_m: 2.4, confidence: 0.6 }),
      piece({ asset_id: 'floor-lamp', x_m: 3, z_m: 2.6, confidence: 0.5 }),
    ]
    const result = solve(crowd, { room })
    const boxes = result.pieces.map(boxFor)
    for (let i = 0; i < boxes.length; i++) {
      const [x0, x1, z0, z1] = boxes[i] as [number, number, number, number]
      expect(x0).toBeGreaterThanOrEqual(0.15 - 1e-6)
      expect(x1).toBeLessThanOrEqual(6 - 0.15 + 1e-6)
      expect(z0).toBeGreaterThanOrEqual(0.15 - 1e-6)
      expect(z1).toBeLessThanOrEqual(5 - 0.15 + 1e-6)
      for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i] as never, boxes[j] as never), `${i} y ${j}`).toBe(false)
    }
  })

  it('las alfombras se pisan con todo: la mesa y el sofá sobre la alfombra no se mueven', () => {
    const plan = [
      piece({ asset_id: 'rectangular-carpet', x_m: 3, z_m: 2.5 }),
      piece({ asset_id: 'coffee-table', x_m: 3, z_m: 2.5 }),
      piece({ asset_id: 'sofa', x_m: 3, z_m: 3.6, facing_deg: 180 }),
    ]
    const result = solve(plan, { room })
    expect(result.pieces.map((p) => [p.x, p.z])).toEqual([
      [3, 2.5],
      [3, 2.5],
      [3, 3.6],
    ])
    expect(result.warnings).toEqual([])
  })

  it('un solape de menos de 3 cm no es un solape (la posición de una foto no es tan precisa)', () => {
    const a = piece({ asset_id: 'bookshelf', x_m: 2, z_m: 1.5, facing_deg: 0 })
    const b = piece({ asset_id: 'bookshelf', x_m: 2.92, z_m: 1.5, confidence: 0.5 }) // 0,93 de ancho: pisa 0,01 m
    const result = solve([a, b], { room })
    expect(result.pieces.map((p) => p.x)).toEqual([2, 2.92])
  })

  it('una pieza pegada a un muro solo se desliza a lo largo de él (nunca se despega)', () => {
    const left = piece({ asset_id: 'bookshelf', against_wall: 'n', x_m: 2, z_m: 0.3, confidence: 0.9 })
    const right = piece({ asset_id: 'bookshelf', against_wall: 'n', x_m: 2.3, z_m: 0.3, confidence: 0.5 })
    const [a, b] = solve([left, right], { room }).pieces
    expect(a?.z).toBe(b?.z)
    expect(a?.z).toBeCloseTo(0.15 + 0.165, 3)
    expect(Math.abs((b?.x ?? 0) - (a?.x ?? 0))).toBeGreaterThanOrEqual(0.93 - 1e-6)
  })

  it('avisa lo que movió más de 25 cm, con el nombre de la pieza', () => {
    const keep = piece({ asset_id: 'sofa', x_m: 3, z_m: 2.5, confidence: 0.9 })
    const moved = piece({ asset_id: 'sofa', x_m: 3.4, z_m: 3, confidence: 0.5 })
    const warnings = solve([keep, moved], { room }).warnings
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/Sofá/)
    expect(warnings[0]).toMatch(/superpon/)
    const near = solve([keep, piece({ asset_id: 'sofa', x_m: 3, z_m: 3.4, confidence: 0.5 })], { room })
    expect(near.warnings).toEqual([]) // se movió 0,1 m
  })
})

describe('solveLayout: lo que se sale del ambiente', () => {
  it('lo que queda fuera (su centro a más de 0,25 m de los muros) se saca, con aviso', () => {
    const result = solve([piece({ asset_id: 'sofa', x_m: 9, z_m: 1.5 }), piece({ asset_id: 'bookshelf', x_m: 2, z_m: 1.5 })])
    expect(result.pieces.map((p) => p.asset.id)).toEqual(['bookshelf'])
    expect(result.warnings.some((w) => /Sofá/.test(w) && /fuera del ambiente/.test(w))).toBe(true)
  })

  it('lo que solo se pasa un poco (la foto no es tan precisa) se mete adentro y se conserva, avisando que se movió', () => {
    const result = solve([piece({ asset_id: 'bookshelf', x_m: 4.1, z_m: 1.5 })])
    const shelf = result.pieces[0]
    expect(shelf?.x).toBeCloseTo(4 - 0.15 - 0.465, 3)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/Biblioteca/)
    expect(result.warnings[0]).toMatch(/hacia adentro/)
  })

  it('una pieza que no cabe en el ambiente ni girada (una cama doble en 1,5 × 1,5 m) se saca con aviso', () => {
    const result = solve([piece({ asset_id: 'double-bed', x_m: 0.75, z_m: 0.75 })], { room: { width_m: 1.5, depth_m: 1.5 } })
    expect(result.pieces).toEqual([])
    expect(result.warnings.some((w) => /Cama doble/.test(w) && /no cabe/.test(w))).toBe(true)
  })

  it('una alfombra que ocupa casi todo el ancho apenas puede moverse (2,78 m en un ambiente de 3,1 m)', () => {
    const rug = solve([piece({ asset_id: 'rectangular-carpet', x_m: 0.2, z_m: 1.5 })], { room: { width_m: 3.1, depth_m: 3 } }).pieces[0]
    expect(rug?.x).toBeCloseTo(1.54, 3)
    expect(boxOf('rectangular-carpet', rug?.x ?? 0, rug?.z ?? 0, 0)[0]).toBeGreaterThanOrEqual(0.15 - 1e-6)
  })
})

describe('solveLayout: puertas y ventanas', () => {
  it('conserva las del plano en su muro, con la posición medida al centro desde la esquina izquierda mirando el muro desde dentro', () => {
    const result = solve([], { openings: [opening({ type: 'door', wall: 's', at_m: 1 }), opening({ type: 'window', wall: 'e', at_m: 1.5, width_m: 1.2 })] })
    expect(result.openings).toEqual([
      { type: 'door', wall: 's', at: 1, width: 0.9 },
      { type: 'window', wall: 'e', at: 1.5, width: 1.2 },
    ])
  })

  it('una abertura se aleja 0,3 m de cada esquina y su ancho se limita al muro', () => {
    const result = solve([], { openings: [opening({ wall: 'n', at_m: 0 }), opening({ type: 'window', wall: 'e', at_m: 1.5, width_m: 5 })] })
    expect(result.openings[0]?.at).toBeCloseTo(0.75, 3) // 0,3 + 0,9 / 2
    expect(result.openings[1]).toMatchObject({ wall: 'e', width: 2.4, at: 1.5 }) // el muro mide 3 m: 3 - 2 × 0,3
  })

  it('dos aberturas del mismo muro no se pisan: la segunda se corre, o se omite con aviso si no hay lugar', () => {
    const shifted = solve([], { openings: [opening({ wall: 'n', at_m: 2 }), opening({ type: 'window', wall: 'n', at_m: 2.2, width_m: 1 })] })
    const [door, win] = shifted.openings
    expect(Math.abs((win?.at ?? 0) - (door?.at ?? 0))).toBeGreaterThanOrEqual(0.9 / 2 + 1 / 2)
    const tight = solve([], { room: { width_m: 1.8, depth_m: 3 }, openings: [opening({ wall: 'n', at_m: 0.9 }), opening({ type: 'window', wall: 'n', at_m: 0.9, width_m: 0.6 })] })
    expect(tight.openings).toHaveLength(1)
    expect(tight.warnings.some((w) => /ventana/i.test(w) && /omiti/.test(w))).toBe(true)
  })

  it('una puerta no queda tapada: el mueble que estaba delante (0,9 m libres) se corre', () => {
    const dresser = piece({ asset_id: 'dresser', x_m: 3, z_m: 2.5 })
    const result = solve([dresser], { openings: [opening({ wall: 's', at_m: 1 })] }) // la puerta, centrada en x = 3
    const box = boxFor(first(result, 'dresser'))
    expect(overlaps(box, [2.55, 3.45, 2.0, 3.0], 0.001)).toBe(false)
    expect(result.pieces[0]?.z).toBeLessThan(2.5)
  })

  it('un mueble pegado al muro de la puerta se desliza a lo largo del muro, sin despegarse', () => {
    const sofa = piece({ asset_id: 'sofa', x_m: 3, z_m: 2.3, against_wall: 's' })
    const result = solve([sofa], { openings: [opening({ wall: 's', at_m: 1 })] })
    const placed = first(result, 'sofa')
    expect(placed.z).toBeCloseTo(3 - 0.15 - 0.505, 3)
    expect(overlaps(boxFor(placed), [2.55, 3.45, 2.0, 3.0], 0.001)).toBe(false)
  })

  it('sin puertas no hay nada que despejar: el sofá junto al muro sur se queda donde está', () => {
    const result = solve([piece({ asset_id: 'sofa', x_m: 2, z_m: 2.3, facing_deg: 180 })])
    expect([result.pieces[0]?.x, result.pieces[0]?.z]).toEqual([2, 2.3])
  })

  it('una ventana solo se despeja de lo alto (más de 1 m): el sofá bajo la ventana se queda, el armario no', () => {
    const window = [opening({ type: 'window', wall: 'n', at_m: 3, width_m: 1.6 })]
    const room = { width_m: 6, depth_m: 3 }
    const sofa = solve([piece({ asset_id: 'sofa', x_m: 3, z_m: 0.5, against_wall: 'n' })], { room, openings: window })
    expect(sofa.pieces[0]?.x).toBe(3)
    const closet = solve([piece({ asset_id: 'closet', x_m: 3, z_m: 0.5, against_wall: 'n' })], { room, openings: window })
    expect(overlaps(boxFor(first(closet, 'closet')), [2.2, 3.8, 0, 0.4], 0.001)).toBe(false)
  })

  it('las aberturas que el acomodador resuelve no dependen de los muebles: las mismas con o sin ellos', () => {
    const openings = [opening({ wall: 's', at_m: 1 }), opening({ type: 'window', wall: 'e', at_m: 1.5, width_m: 1.2 })]
    expect(solve([piece({ asset_id: 'dresser', x_m: 3, z_m: 2.5 })], { openings }).openings).toEqual(solve([], { openings }).openings)
  })
})
