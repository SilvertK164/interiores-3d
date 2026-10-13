import { describe, expect, it } from 'vitest'
import { buildLabEnvelope } from '../src/editor/lab-scene'
import { MATERIAL_IDS } from '../src/editor/templates/scene-builder'
import { analysisToCluster } from '../src/lib/lab/analysis-to-cluster'
import { analysisToDefinition } from '../src/lib/lab/analysis-to-definition'
import { buildAnalysisCatalog } from '../src/lib/lab/analysis-catalog'
import { solveLayout } from '../src/lib/lab/layout-solver'
import { EXAMPLE_ANALYSIS, EXAMPLE_PHOTO } from '../src/lib/lab/sample-analysis'
import { RoomAnalysisSchema } from '../src/lib/lab/schema'
import { validateDefinition } from '../src/lib/templates/validate'
import { availableAssets } from './support/asset-ids'
import { ASSETS, resolve } from './support/layout'

// EXAMPLE_ANALYSIS es el plano que traen los botones «Probar con un ejemplo», junto con la foto `public/examples/salon.jpg`: un salón largo y
// angosto de 3,6 × 7,5 m. Aquí se comprueba que cumple el contrato, que usa piezas reales del catálogo y que el acomodador casi no lo toca
// (el plano ya está acomodado: lo que se ve en el editor es lo que está escrito).

const ids = EXAMPLE_ANALYSIS.furniture.map((f) => f.asset_id)
const count = (id: string) => ids.filter((x) => x === id).length

describe('EXAMPLE_ANALYSIS (el plano de la foto de ejemplo)', () => {
  const { pieces } = buildAnalysisCatalog(availableAssets().map((a) => ({ id: a.id, name: a.name })))

  it('cumple el esquema del contrato y todas sus piezas son del catálogo que se le ofrece al análisis', () => {
    expect(RoomAnalysisSchema.safeParse(EXAMPLE_ANALYSIS).success).toBe(true)
    for (const id of ids) expect(pieces.has(id), id).toBe(true)
  })

  it('es el salón largo y angosto con la cámara en el muro sur mirando al norte, y la foto de ejemplo vive en public/', () => {
    expect(EXAMPLE_ANALYSIS.room).toEqual({ width_m: 3.6, depth_m: 7.5 })
    expect(EXAMPLE_ANALYSIS.camera).toEqual({ x_m: 1.8, z_m: 7.4, look_at: { x_m: 1.8, z_m: 0 } })
    expect(EXAMPLE_PHOTO.src).toBe('/examples/salon.jpg')
    expect(EXAMPLE_PHOTO.alt.length).toBeGreaterThan(20)
  })

  it('trae lo de la foto: tele sobre su mueble, plantas, alfombra, mesa de centro, sofá, dos sillones y un comedor con cuatro sillas', () => {
    expect(count('tv-stand')).toBe(1)
    expect(count('television')).toBe(1)
    expect(EXAMPLE_ANALYSIS.furniture.find((f) => f.asset_id === 'television')?.on_top_of).toBe(ids.indexOf('tv-stand'))
    expect(count('indoor-plant')).toBe(2)
    expect(count('rectangular-carpet')).toBe(1)
    expect(count('coffee-table')).toBe(1)
    expect(count('sofa')).toBe(1)
    expect(count('lounge-chair')).toBe(2)
    expect(count('dining-table')).toBe(1)
    expect(count('dining-chair')).toBe(4)
  })

  it('la tele va contra el muro norte, el sofá contra el este mirando al oeste y los dos sillones miran al norte', () => {
    const of = (id: string) => EXAMPLE_ANALYSIS.furniture.filter((f) => f.asset_id === id)
    expect(of('tv-stand')[0]?.against_wall).toBe('n')
    expect(of('sofa')[0]).toMatchObject({ against_wall: 'e', facing_deg: 90 })
    for (const chair of of('lounge-chair')) expect(chair.facing_deg).toBe(180)
  })

  it('tiene una ventana en el muro este (a 3 m, de 2,4 m) y una puerta en el muro oeste (a 5,6 m)', () => {
    expect(EXAMPLE_ANALYSIS.openings).toContainEqual({ type: 'window', wall: 'e', at_m: 3, width_m: 2.4 })
    expect(EXAMPLE_ANALYSIS.openings.find((o) => o.type === 'door')).toMatchObject({ wall: 'w', at_m: 5.6 })
  })

  it('todas las confianzas son de 0,7 o más y trae un aviso del análisis', () => {
    for (const f of EXAMPLE_ANALYSIS.furniture) expect(f.confidence, f.asset_id).toBeGreaterThanOrEqual(0.7)
    expect(EXAMPLE_ANALYSIS.warnings).toHaveLength(1)
  })

  it('el acomodador no descarta ni mueve nada: las 14 piezas quedan donde están escritas, mirando adonde dice el plano, sin avisos de corrección', () => {
    const warnings: string[] = []
    const plan = solveLayout(EXAMPLE_ANALYSIS, resolve)
    expect(plan.warnings).toEqual([])
    expect(plan.pieces).toHaveLength(EXAMPLE_ANALYSIS.furniture.length)
    for (const placed of plan.pieces) {
      const wrote = EXAMPLE_ANALYSIS.furniture[placed.source]
      expect(Math.hypot(placed.x - (wrote?.x_m ?? 0), placed.z - (wrote?.z_m ?? 0)), placed.asset.id).toBeLessThanOrEqual(0.06)
      expect((((placed.facingDeg - (wrote?.facing_deg ?? 0)) % 360) + 360) % 360, placed.asset.id).toBe(0)
    }
    expect(analysisToCluster(EXAMPLE_ANALYSIS, resolve, { warn: (m) => warnings.push(m) })).toHaveLength(14)
    expect(warnings).toEqual([])
  })

  it('pasa el validador de plantillas y Pascal lo dibuja: una zona, cuatro muros, una puerta, una ventana y las 14 piezas', () => {
    const catalog = new Map(
      [...ASSETS.values()].map(({ id, name, dimensions }) => [
        id,
        { id, name, category: 'furniture', tags: [], src: `/items/${id}/model.glb`, thumbnail: `/items/${id}/thumbnail.webp`, dimensions },
      ]),
    )
    const definition = analysisToDefinition(EXAMPLE_ANALYSIS, (id) => catalog.get(id), { warn: () => undefined })
    expect(validateDefinition(definition, new Set(catalog.keys()), MATERIAL_IDS)).toEqual([])
    const envelope = buildLabEnvelope(definition, catalog as never)
    const counts: Record<string, number> = {}
    for (const node of Object.values(envelope.graph.nodes) as { type: string }[]) counts[node.type] = (counts[node.type] ?? 0) + 1
    expect(counts).toMatchObject({ zone: 1, wall: 4, door: 1, window: 1, item: 14 })
  })
})
