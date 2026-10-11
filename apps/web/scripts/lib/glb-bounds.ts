type Vec3 = [number, number, number]
type Gltf = {
  scene?: number
  scenes: { nodes: number[] }[]
  nodes: { mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[]
  meshes: { primitives: { attributes: { POSITION: number } }[] }[]
  accessors: { min: number[]; max: number[] }[]
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

// Matrices de 16 números en orden de columnas, como glTF.
function multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(16).fill(0)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += (a[k * 4 + r] as number) * (b[c * 4 + k] as number)
      out[c * 4 + r] = sum
    }
  }
  return out
}

function localMatrix(node: Gltf['nodes'][number]): number[] {
  if (node.matrix) return node.matrix
  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]
  const r00 = 1 - 2 * (y! * y! + z! * z!)
  const r01 = 2 * (x! * y! - z! * w!)
  const r02 = 2 * (x! * z! + y! * w!)
  const r10 = 2 * (x! * y! + z! * w!)
  const r11 = 1 - 2 * (x! * x! + z! * z!)
  const r12 = 2 * (y! * z! - x! * w!)
  const r20 = 2 * (x! * z! - y! * w!)
  const r21 = 2 * (y! * z! + x! * w!)
  const r22 = 1 - 2 * (x! * x! + y! * y!)
  return [
    r00 * sx!, r10 * sx!, r20 * sx!, 0,
    r01 * sy!, r11 * sy!, r21 * sy!, 0,
    r02 * sz!, r12 * sz!, r22 * sz!, 0,
    tx!, ty!, tz!, 1,
  ]
}

const round3 = (n: number) => Math.round(n * 1000) / 1000 + 0 // `+ 0` evita -0

/** Caja envolvente (en metros) de un GLB: recorre los nodos aplicando traslación, rotación y escala. */
export function glbBounds(input: Uint8Array): { size: Vec3; min: Vec3 } {
  const buf = Buffer.from(input)
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) throw new Error('El archivo no es un GLB')
  const jsonLength = buf.readUInt32LE(12)
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8')) as Gltf
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]

  const walk = (index: number, parent: number[]) => {
    const node = gltf.nodes[index]!
    const m = multiply(parent, localMatrix(node))
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh]!.primitives) {
        const acc = gltf.accessors[primitive.attributes.POSITION]!
        for (const cx of [acc.min[0]!, acc.max[0]!]) {
          for (const cy of [acc.min[1]!, acc.max[1]!]) {
            for (const cz of [acc.min[2]!, acc.max[2]!]) {
              const p: Vec3 = [
                m[0]! * cx + m[4]! * cy + m[8]! * cz + m[12]!,
                m[1]! * cx + m[5]! * cy + m[9]! * cz + m[13]!,
                m[2]! * cx + m[6]! * cy + m[10]! * cz + m[14]!,
              ]
              for (let i = 0; i < 3; i++) {
                min[i] = Math.min(min[i]!, p[i]!)
                max[i] = Math.max(max[i]!, p[i]!)
              }
            }
          }
        }
      }
    }
    for (const child of node.children ?? []) walk(child, m)
  }

  for (const root of gltf.scenes[gltf.scene ?? 0]!.nodes) walk(root, IDENTITY)
  return {
    size: [round3(max[0]! - min[0]!), round3(max[1]! - min[1]!), round3(max[2]! - min[2]!)],
    min: [round3(min[0]!), round3(min[1]!), round3(min[2]!)],
  }
}
