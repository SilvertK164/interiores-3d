import { describe, expect, it } from 'vitest'
import { SCENE_MAX_BYTES, SceneEnvelopeSchema, emptyEnvelope, isEmptyGraph } from '../src/index.js'

describe('SceneEnvelope', () => {
  it('acepta la escena vacía que crea la API', () => {
    expect(SceneEnvelopeSchema.safeParse(emptyEnvelope()).success).toBe(true)
  })

  it('rechaza un schemaVersion que no es el actual', () => {
    const bad = { ...emptyEnvelope(), schemaVersion: 2 }
    expect(SceneEnvelopeSchema.safeParse(bad).success).toBe(false)
  })

  it('rechaza un grafo sin nodes ni rootNodeIds', () => {
    const bad = { ...emptyEnvelope(), graph: {} }
    expect(SceneEnvelopeSchema.safeParse(bad).success).toBe(false)
  })

  it('conserva campos desconocidos del grafo de Pascal', () => {
    const env = emptyEnvelope()
    const withExtra = { ...env, graph: { ...env.graph, futuro: { a: 1 } } }
    const parsed = SceneEnvelopeSchema.parse(withExtra)
    expect((parsed.graph as Record<string, unknown>).futuro).toEqual({ a: 1 })
  })

  it('reconoce una escena vacía y una con contenido', () => {
    expect(isEmptyGraph(emptyEnvelope().graph)).toBe(true)
    expect(isEmptyGraph({ nodes: { wall_1: {} }, rootNodeIds: ['wall_1'] })).toBe(false)
  })

  it('el límite de escena es de 5 MB', () => {
    expect(SCENE_MAX_BYTES).toBe(5 * 1024 * 1024)
  })
})
