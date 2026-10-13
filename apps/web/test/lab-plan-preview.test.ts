import { describe, expect, it } from 'vitest'
import { analysisToDefinition } from '../src/lib/lab/analysis-to-definition'
import { type PlanPreview, type PreviewPiece, planPreview, shortLabel } from '../src/lib/lab/plan-preview'
import { EXAMPLE_ANALYSIS, SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import type { RoomAnalysis } from '../src/lib/lab/schema'
import { dims, planOf, piece, resolve } from './support/layout'
import { randomPlan } from './support/random-plan'

// La vista previa «desde arriba» de /escena-desde-foto es geometría pura: del TemplateDefinition que arma `analysisToDefinition` (y de las medidas
// del catálogo local) salen el ambiente, los muros, las aberturas, cada pieza con su tamaño real y su giro, hacia dónde mira y la cámara.
// El componente solo las dibuja; aquí se comprueba lo que la persona tiene que poder entender.

const previewOf = (analysis: RoomAnalysis): PlanPreview => planPreview(analysisToDefinition(analysis, resolve), resolve, analysis.camera)
const example = previewOf(EXAMPLE_ANALYSIS)
const pieceOf = (preview: PlanPreview, id: string, nth = 0): PreviewPiece => {
  const found = preview.pieces.filter((p) => p.asset === id)[nth]
  if (!found) throw new Error(`falta ${id}`)
  return found
}
const bounds = (points: readonly (readonly [number, number])[]) => {
  const xs = points.map((p) => p[0])
  const zs = points.map((p) => p[1])
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) }
}
const center = (p: PreviewPiece): [number, number] => [(bounds(p.corners).x0 + bounds(p.corners).x1) / 2, (bounds(p.corners).z0 + bounds(p.corners).z1) / 2]

describe('shortLabel', () => {
  it('abrevia los nombres largos del catálogo y deja los cortos', () => {
    expect(shortLabel('tv-stand')).toBe('Mueble TV')
    expect(shortLabel('television')).toBe('Tele')
    expect(shortLabel('rectangular-carpet')).toBe('Alfombra')
    expect(shortLabel('coffee-table')).toBe('Mesa centro')
    expect(shortLabel('lounge-chair')).toBe('Sillón')
    expect(shortLabel('dining-chair')).toBe('Silla')
    expect(shortLabel('dining-table')).toBe('Comedor')
    expect(shortLabel('indoor-plant')).toBe('Planta')
    expect(shortLabel('sofa')).toBe('Sofá')
    expect(shortLabel('bookshelf')).toBe('Biblioteca')
  })

  it('una pieza que la tabla no conoce usa su nombre (o su id) y se corta a una palabra si es largo', () => {
    expect(shortLabel('pieza-nueva', 'Banco')).toBe('Banco')
    expect(shortLabel('pieza-nueva', 'Banco de trabajo extra largo')).toBe('Banco')
    expect(shortLabel('pieza-nueva')).toBe('pieza-nueva')
  })
})

describe('planPreview del salón de ejemplo', () => {
  it('el ambiente es el rectángulo de 3,6 × 7,5 m con sus cuatro muros y cabe entero en la caja de dibujo', () => {
    expect(example.room).toEqual({ x0: 0, z0: 0, x1: 3.6, z1: 7.5 })
    expect(example.walls).toHaveLength(4)
    const { x, y, width, height } = example.viewBox
    expect(x).toBeLessThan(0)
    expect(y).toBeLessThan(0)
    expect(x + width).toBeGreaterThan(3.6)
    expect(y + height).toBeGreaterThan(7.5)
    expect(example.fontSize).toBeGreaterThan(0.1)
  })

  it('dibuja las 14 piezas, cada una con el tamaño real del catálogo y su giro', () => {
    expect(example.pieces).toHaveLength(14)
    const [tvW, , tvD] = dims('tv-stand')
    const stand = bounds(pieceOf(example, 'tv-stand').corners)
    expect(stand.x1 - stand.x0).toBeCloseTo(tvW, 2)
    expect(stand.z1 - stand.z0).toBeCloseTo(tvD, 2)
    // El sofá gira 90°: su largo corre de norte a sur (a lo largo del muro este) y su fondo de oeste a este.
    const [sofaW, , sofaD] = dims('sofa')
    const sofa = bounds(pieceOf(example, 'sofa').corners)
    expect(sofa.x1 - sofa.x0).toBeCloseTo(sofaD, 2)
    expect(sofa.z1 - sofa.z0).toBeCloseTo(sofaW, 2)
  })

  it('el sofá mira al oeste (hacia la tele y la mesa), los dos sillones al norte y la tele al sur', () => {
    const sofa = pieceOf(example, 'sofa')
    expect(sofa.front?.tip[0]).toBeLessThan(center(sofa)[0])
    expect(sofa.front?.tip[1]).toBeCloseTo(center(sofa)[1], 1)
    for (const nth of [0, 1]) {
      const chair = pieceOf(example, 'lounge-chair', nth)
      expect(chair.front?.tip[1], 'sillón mira al norte').toBeLessThan(center(chair)[1])
    }
    const tv = pieceOf(example, 'television')
    expect(tv.front?.tip[1], 'la tele mira al sur').toBeGreaterThan(center(tv)[1])
    // Las cuatro sillas del comedor miran a la mesa: las de arriba al sur, las de abajo al norte.
    const table = center(pieceOf(example, 'dining-table'))
    for (const nth of [0, 1, 2, 3]) {
      const chair = pieceOf(example, 'dining-chair', nth)
      const [, z] = center(chair)
      expect(Math.sign((chair.front?.tip[1] ?? 0) - z), `silla ${nth}`).toBe(Math.sign(table[1] - z))
    }
  })

  it('la mesa de centro y la alfombra quedan al medio, la alfombra debajo, y la tele se dibuja encima de su mueble', () => {
    const order = example.pieces.map((p) => p.asset)
    expect(order.indexOf('rectangular-carpet')).toBeLessThan(order.indexOf('coffee-table'))
    expect(order.indexOf('tv-stand')).toBeLessThan(order.indexOf('television'))
    expect(order[order.length - 1]).toBe('television')
    const rug = center(pieceOf(example, 'rectangular-carpet'))
    const table = center(pieceOf(example, 'coffee-table'))
    expect(Math.hypot(rug[0] - table[0], rug[1] - table[1])).toBeLessThan(0.3)
    expect(pieceOf(example, 'television').stacked).toBe(true)
    expect(pieceOf(example, 'rectangular-carpet').kind).toBe('rug')
  })

  it('las alfombras y las plantas no llevan marca de frente; lo demás sí', () => {
    expect(pieceOf(example, 'rectangular-carpet').front).toBeNull()
    expect(pieceOf(example, 'indoor-plant').front).toBeNull()
    expect(pieceOf(example, 'sofa').front).not.toBeNull()
  })

  it('la ventana va en el muro este (a 3 m, de 2,4 m) y la puerta en el muro oeste, con su hoja y su arco', () => {
    const window = example.openings.find((o) => o.type === 'window')
    const door = example.openings.find((o) => o.type === 'door')
    const w = bounds(window?.corners ?? [])
    expect(w.x0).toBeGreaterThan(3.4)
    expect(w.x1).toBeLessThan(3.8)
    expect(w.z0).toBeCloseTo(1.8, 2)
    expect(w.z1).toBeCloseTo(4.2, 2)
    const d = bounds(door?.corners ?? [])
    expect(d.x0).toBeLessThan(0.1)
    expect(d.x1).toBeGreaterThan(-0.2)
    expect(d.z1 - d.z0).toBeCloseTo(0.9, 2)
    expect(window?.swing).toBeNull()
    expect(door?.swing?.leaf[1][0], 'la hoja abre hacia adentro (al este)').toBeGreaterThan(0.5)
  })

  it('la cámara está en el muro sur (corrida a 0,3 m de él) y mira al norte, con su cono hacia adelante', () => {
    expect(example.camera?.at).toEqual([1.8, 7.2])
    expect(example.camera?.cone[1][1]).toBeLessThan(7.2)
    expect(example.camera?.cone[2][1]).toBeLessThan(7.2)
    expect(example.camera?.cone[1][0]).toBeLessThan(1.8)
    expect(example.camera?.cone[2][0]).toBeGreaterThan(1.8)
  })

  it('cada pieza lleva su etiqueta corta en castellano y ninguna se pisa con otra ni se sale del ambiente', () => {
    const labels = example.pieces.map((p) => p.label)
    expect(labels.every((l) => l !== null)).toBe(true)
    expect(example.pieces.map((p) => p.label?.text)).toContain('Mueble TV')
    expect(example.pieces.map((p) => p.label?.text)).toContain('Tele')
    expect(example.pieces.map((p) => p.label?.text)).toContain('Sofá')
    expect(example.pieces.map((p) => p.label?.text)).toContain('Alfombra')
    const all = [...labels, example.camera?.label ?? null].flatMap((l) => (l ? [l] : []))
    for (const [i, a] of all.entries()) {
      expect(a.x - a.width / 2, a.text).toBeGreaterThanOrEqual(example.room.x0)
      expect(a.x + a.width / 2, a.text).toBeLessThanOrEqual(example.room.x1)
      expect(a.z - a.height / 2, a.text).toBeGreaterThanOrEqual(example.room.z0)
      expect(a.z + a.height / 2, a.text).toBeLessThanOrEqual(example.room.z1)
      for (const b of all.slice(i + 1)) {
        const apart = Math.abs(a.x - b.x) >= (a.width + b.width) / 2 || Math.abs(a.z - b.z) >= (a.height + b.height) / 2
        expect(apart, `${a.text} y ${b.text}`).toBe(true)
      }
    }
  })

  it('el texto alternativo resume el ambiente, las piezas, las aberturas y la cámara', () => {
    expect(example.summary).toBe(
      'Vista desde arriba de un ambiente de 3,6 × 7,5 m con 14 muebles, 1 puerta y 1 ventana. La foto se tomó desde el muro sur, mirando hacia el norte.',
    )
  })
})

describe('planPreview en general', () => {
  it('sin cámara no dibuja cámara y el resumen no habla de ella; con una sola pieza y sin aberturas usa el singular', () => {
    const analysis = planOf([piece({ asset_id: 'sofa', x_m: 2, z_m: 1.5 })], { room: { width_m: 4, depth_m: 3 } })
    const definition = analysisToDefinition(analysis, resolve)
    const preview = planPreview(definition, resolve)
    expect(preview.camera).toBeNull()
    expect(preview.summary).toBe('Vista desde arriba de un ambiente de 4 × 3 m con 1 mueble, sin puertas ni ventanas.')
  })

  it('una pieza sin medidas en el catálogo se dibuja de 0,5 × 0,5 m, sin fallar', () => {
    const definition = analysisToDefinition(SAMPLE_ANALYSIS, resolve)
    const noSizes = planPreview(definition, (id) => ({ id }), SAMPLE_ANALYSIS.camera)
    const first = bounds(noSizes.pieces[0]?.corners ?? [])
    expect(first.x1 - first.x0).toBeCloseTo(0.5, 2)
  })

  it('barrido de planos al azar: todo cabe en la caja de dibujo, nada es NaN y las etiquetas no se pisan', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const analysis = randomPlan(seed)
      const preview = previewOf(analysis)
      const { x, y, width, height } = preview.viewBox
      const inside = (p: readonly [number, number]) => p[0] >= x - 1e-6 && p[0] <= x + width + 1e-6 && p[1] >= y - 1e-6 && p[1] <= y + height + 1e-6
      expect(Number.isFinite(width + height + preview.fontSize), `plano ${seed}`).toBe(true)
      for (const shape of preview.pieces) {
        expect(shape.corners.every(inside), `plano ${seed}: ${shape.asset}`).toBe(true)
        expect(shape.corners.flat().every(Number.isFinite), `plano ${seed}`).toBe(true)
      }
      const labels = [...preview.pieces.map((p) => p.label), preview.camera?.label ?? null].flatMap((l) => (l ? [l] : []))
      for (const [i, a] of labels.entries()) {
        for (const b of labels.slice(i + 1)) {
          const apart = Math.abs(a.x - b.x) >= (a.width + b.width) / 2 - 1e-9 || Math.abs(a.z - b.z) >= (a.height + b.height) / 2 - 1e-9
          expect(apart, `plano ${seed}: ${a.text} y ${b.text}`).toBe(true)
        }
      }
    }
  })
})
