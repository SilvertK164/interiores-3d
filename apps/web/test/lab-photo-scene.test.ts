import { describe, expect, it } from 'vitest'
import { photoScene } from '../src/lib/lab/photo-scene'
import { EXAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'
import { piece, planOf, resolve } from './support/layout'

// `photoScene` es lo que la página revisa antes de crear el proyecto: la misma definición, cámara y avisos que luego abre el editor, más su vista previa.
describe('photoScene', () => {
  it('el salón de ejemplo da la definición, la cámara de la foto y una vista previa con sus 14 piezas, sin avisos', () => {
    const scene = photoScene(EXAMPLE_ANALYSIS, resolve)
    expect(scene.definition.levels[0]?.items).toHaveLength(14)
    expect(scene.plan.pieces).toHaveLength(14)
    expect(scene.camera.position[1]).toBeGreaterThan(1)
    expect(scene.warnings).toEqual([])
  })

  it('lo que el acomodador deja afuera sale en los avisos y no en la vista previa', () => {
    const scene = photoScene(planOf([piece({ asset_id: 'sofa' }), piece({ asset_id: 'cactus', x_m: 1, z_m: 1, confidence: 0.1 })]), resolve)
    expect(scene.plan.pieces.map((p) => p.asset)).toEqual(['sofa'])
    expect(scene.warnings.length).toBeGreaterThan(0)
  })
})
