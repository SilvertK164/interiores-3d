import { describe, expect, it } from 'vitest'
import { glbBounds } from '../scripts/lib/glb-bounds'

/** Arma un GLB mínimo (solo el trozo JSON): glbBounds lee los mínimos y máximos de los accesores. */
function makeGlb(json: object): Buffer {
  let text = JSON.stringify(json)
  while (Buffer.byteLength(text) % 4 !== 0) text += ' '
  const body = Buffer.from(text)
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(20 + body.length, 8)
  header.writeUInt32LE(body.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)
  return Buffer.concat([header, body])
}

const box = (min: number[], max: number[]) => ({
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ type: 'VEC3', min, max }],
})

describe('glbBounds', () => {
  it('mide una caja sin transformaciones', () => {
    const glb = makeGlb({ scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], ...box([-0.5, 0, -0.5], [0.5, 1, 0.5]) })
    expect(glbBounds(glb)).toEqual({ size: [1, 1, 1], min: [-0.5, 0, -0.5] })
  })

  it('aplica la escala del nodo', () => {
    const glb = makeGlb({ scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, scale: [2, 2, 2] }], ...box([0, 0, 0], [1, 1, 1]) })
    expect(glbBounds(glb).size).toEqual([2, 2, 2])
  })

  it('acumula la traslación de un nodo padre', () => {
    const glb = makeGlb({
      scenes: [{ nodes: [0] }],
      nodes: [{ children: [1], translation: [10, 0, 0] }, { mesh: 0 }],
      ...box([0, 0, 0], [1, 1, 1]),
    })
    expect(glbBounds(glb).min).toEqual([10, 0, 0])
  })

  it('una rotación de 90° sobre Y intercambia ancho y fondo', () => {
    const s = Math.SQRT1_2
    const glb = makeGlb({
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, rotation: [0, s, 0, s] }],
      ...box([0, 0, 0], [2, 1, 1]),
    })
    expect(glbBounds(glb).size).toEqual([1, 1, 2])
  })

  it('rechaza un archivo que no es GLB', () => {
    expect(() => glbBounds(Buffer.from('no soy un glb, de verdad que no'))).toThrow('no es un GLB')
  })
})
