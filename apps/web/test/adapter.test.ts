import { emptyEnvelope } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { fromEnvelope, toEnvelope } from '../src/editor/adapter.js'

describe('adapter de escena', () => {
  it('toEnvelope envuelve el grafo con el contrato vigente', () => {
    const graph = { nodes: { wall_1: { type: 'wall' } }, rootNodeIds: ['wall_1'] }
    expect(toEnvelope(graph)).toEqual({ schemaVersion: 1, pascal: { core: '1.0.3' }, graph })
  })

  it('fromEnvelope devuelve null para una escena vacía, para que el editor use la suya', () => {
    expect(fromEnvelope(emptyEnvelope())).toBeNull()
  })

  it('fromEnvelope devuelve el grafo cuando hay contenido', () => {
    const env = { ...emptyEnvelope(), graph: { nodes: { a: {} }, rootNodeIds: ['a'] } }
    expect(fromEnvelope(env)).toEqual({ nodes: { a: {} }, rootNodeIds: ['a'] })
  })

  it('fromEnvelope lanza un error en castellano si el envelope no es válido', () => {
    expect(() => fromEnvelope({ schemaVersion: 9 })).toThrow('La escena guardada no tiene el formato esperado')
  })
})
