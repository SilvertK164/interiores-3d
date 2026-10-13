import { describe, expect, it } from 'vitest'
import { buildLabEnvelope } from '../src/editor/lab-scene'
import { analysisToDefinition } from '../src/lib/lab/analysis-to-definition'
import {
  EYE_HEIGHT_M,
  FLOOR_TOP_M,
  MAX_VIEW_REACH_M,
  MIN_VIEW_DISTANCE_M,
  NEAR_WALL_GAP_M,
  TARGET_HEIGHT_M,
  type CameraPose,
  type Vec3,
  photoCameraPose,
  photoSceneCamera,
  sceneCameraPose,
} from '../src/lib/lab/photo-camera'
import type { PhotoCamera } from '../src/lib/lab/schema'
import { sceneCenter } from '../src/lib/templates/geometry'
import type { LevelDef } from '../src/lib/templates/types'
import { planOf, resolve } from './support/layout'

// El punto de vista de la foto: la cámara del editor abre donde estaba quien sacó la foto (dentro del ambiente, en una esquina o apenas
// afuera de un muro), a la altura de los ojos (1,5 m) y mirando hacia el punto del plano que dio el análisis. Lo que se prueba es la regla y
// que la pose quede donde los controles de Pascal (`custom-camera-controls.tsx`) dejan estar: a 2 m o más de su punto de mira y sin bajar de
// ~5,7° sobre el horizonte. `setLookAt` acepta cualquier pose, pero el primer gesto de la persona (rueda o arrastre) llevaría de golpe una
// pose fuera de esos límites hasta ellos.
const PASCAL_MIN_DISTANCE_M = 2
const PASCAL_MAX_POLAR_RAD = Math.PI / 2 - 0.1

const camera = (x_m: number, z_m: number, lookX: number, lookZ: number, fov_deg?: number): PhotoCamera => ({
  x_m,
  z_m,
  look_at: { x_m: lookX, z_m: lookZ },
  ...(fov_deg === undefined ? {} : { fov_deg }),
})

const sub = (a: readonly number[], b: readonly number[]): Vec3 => [(a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0)]
const length = (v: readonly number[]) => Math.hypot(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0)

/** Hacia dónde mira la cámara (unitario), la derecha de la imagen (forward × up, como three.js) y la distancia al punto de mira. */
function view({ position, target }: Pick<CameraPose, 'position' | 'target'>) {
  const delta = sub(target, position)
  const distance = length(delta)
  const forward = delta.map((n) => n / distance) as Vec3
  const right: Vec3 = [-forward[2], 0, forward[0]]
  return { forward, right, distance, polar: Math.acos((position[1] - target[1]) / distance) }
}

describe('photoCameraPose: la cámara en coordenadas del ambiente', () => {
  const room = { width: 4, depth: 3 }

  it('una cámara dentro del ambiente queda donde estaba, a la altura de los ojos', () => {
    const pose = photoCameraPose(room, camera(2, 2, 2, 0))
    expect(pose.position).toEqual([2, EYE_HEIGHT_M, 2])
    expect(EYE_HEIGHT_M).toBe(1.5)
  })

  it('mira hacia el punto que dio el análisis (look_at), a 0,7 m de altura: así entran el piso y los muebles', () => {
    const pose = photoCameraPose(room, camera(2, 2.6, 2, 0.4))
    expect(pose.target[0]).toBe(2)
    expect(pose.target[1]).toBe(TARGET_HEIGHT_M)
    expect(pose.target[2]).toBeCloseTo(0.4, 3) // a 2,2 m: entre el mínimo y el máximo que admiten los controles
  })

  it('a un muro o apenas afuera de él se corre adentro 0,3 m del eje del muro, para que el muro no tape la vista', () => {
    expect(NEAR_WALL_GAP_M).toBe(0.3)
    expect(photoCameraPose(room, camera(2, 3, 2, 0)).position).toEqual([2, 1.5, 2.7])
    expect(photoCameraPose(room, camera(2, 3.8, 2, 0)).position).toEqual([2, 1.5, 2.7])
    expect(photoCameraPose(room, camera(-0.8, 1, 4, 1)).position).toEqual([0.3, 1.5, 1])
    expect(photoCameraPose(room, camera(4.9, 1, 0, 1)).position).toEqual([3.7, 1.5, 1])
    expect(photoCameraPose(room, camera(2, -0.9, 2, 3)).position).toEqual([2, 1.5, 0.3])
  })

  it('en una esquina se corre en los dos ejes y mira en diagonal hacia su punto', () => {
    const pose = photoCameraPose(room, camera(4, 3, 0, 0))
    expect(pose.position).toEqual([3.7, 1.5, 2.7])
    const { forward } = view(pose)
    expect(forward[0]).toBeLessThan(0) // hacia el oeste
    expect(forward[2]).toBeLessThan(0) // y hacia el norte
    expect(Math.abs(forward[0] / forward[2] - 3.7 / 2.7)).toBeLessThan(0.01)
  })

  it('la dirección de la mirada es la de la cámara (ya corrida) hacia look_at: un punto al este mira al este', () => {
    const { forward } = view(photoCameraPose(room, camera(0.5, 1.5, 3.5, 1.5)))
    expect(forward[0]).toBeGreaterThan(0.9)
    expect(Math.abs(forward[2])).toBeLessThan(1e-6)
  })

  it('el objetivo queda a la distancia que admiten los controles: no menos de 2,1 m ni más de 4,5 m en el plano', () => {
    expect(MIN_VIEW_DISTANCE_M).toBe(2.1)
    expect(MAX_VIEW_REACH_M).toBe(4.5)
    const near = photoCameraPose({ width: 8, depth: 9 }, camera(4, 6, 4, 5.6)) // look_at a 0,4 m
    expect(view(near).distance).toBeGreaterThanOrEqual(MIN_VIEW_DISTANCE_M - 0.01) // al milímetro
    expect(near.target[2]).toBeLessThan(near.position[2])
    const far = photoCameraPose({ width: 4, depth: 12 }, camera(2, 11.5, 2, 0)) // look_at a 11,2 m
    expect(Math.hypot(far.target[0] - far.position[0], far.target[2] - far.position[2])).toBeCloseTo(MAX_VIEW_REACH_M, 3)
    expect(far.target[0]).toBe(2) // sigue mirando hacia el mismo lado
  })

  it('con el punto de mira en la misma posición (ya corrida) conserva la dirección de la cámara original hacia él', () => {
    const pose = photoCameraPose(room, camera(2, 3.6, 2, 2.7)) // se corre a z = 2,7: justo donde mira
    expect(pose.target[2]).toBeLessThan(pose.position[2]) // hacia adentro del ambiente
    expect(pose.target[0]).toBe(2)
  })

  it('el campo de visión es el de la foto si lo trae y 60° si no', () => {
    expect(photoCameraPose(room, camera(2, 2, 2, 0)).fov).toBe(60)
    expect(photoCameraPose(room, camera(2, 2, 2, 0, 80)).fov).toBe(80)
  })

  it('la imagen conserva el orden de la foto: mirando al norte el este queda a la derecha; mirando al este, el sur', () => {
    const north = view(photoCameraPose(room, camera(2, 2.7, 2, 0)))
    expect(north.right[0]).toBeGreaterThan(0)
    const east = view(photoCameraPose(room, camera(0.5, 1.5, 4, 1.5)))
    expect(east.right[2]).toBeGreaterThan(0)
  })

  it('barrido de cámaras: siempre adentro del ambiente, a la altura de los ojos y dentro de los límites de los controles de Pascal', () => {
    for (const size of [{ width: 1.5, depth: 1.5 }, { width: 3.2, depth: 7 }, { width: 12, depth: 12 }, { width: 5.3, depth: 3.975 }]) {
      for (let i = 0; i < 40; i++) {
        const x = -1 + ((i * 7) % 13) / 12 * (size.width + 2)
        const z = -1 + ((i * 5) % 11) / 10 * (size.depth + 2)
        const lookX = ((i * 3) % 7) / 6 * size.width
        const lookZ = ((i * 11) % 9) / 8 * size.depth
        if (Math.hypot(lookX - x, lookZ - z) < 0.05) continue
        const pose = photoCameraPose(size, camera(x, z, lookX, lookZ))
        const where = `${size.width}×${size.depth} cámara (${x.toFixed(2)}, ${z.toFixed(2)}) → (${lookX.toFixed(2)}, ${lookZ.toFixed(2)})`
        expect(pose.position[0], where).toBeGreaterThanOrEqual(0.3 - 1e-9)
        expect(pose.position[0], where).toBeLessThanOrEqual(size.width - 0.3 + 1e-9)
        expect(pose.position[2], where).toBeGreaterThanOrEqual(0.3 - 1e-9)
        expect(pose.position[2], where).toBeLessThanOrEqual(size.depth - 0.3 + 1e-9)
        expect(pose.position[1], where).toBe(EYE_HEIGHT_M)
        const { distance, polar } = view(pose)
        expect(distance, where).toBeGreaterThanOrEqual(PASCAL_MIN_DISTANCE_M)
        expect(polar, where).toBeLessThanOrEqual(PASCAL_MAX_POLAR_RAD)
        for (const n of [...pose.position, ...pose.target]) expect(Number.isFinite(n), where).toBe(true)
      }
    }
  })

  it('redondea al milímetro y no deja un -0', () => {
    for (const pose of [photoCameraPose(room, camera(2.12345, 2.98765, 1.11111, 0)), photoCameraPose(room, camera(0, 0, 4, 3))]) {
      for (const n of [...pose.position, ...pose.target]) {
        expect(Math.round(n * 1000) / 1000).toBe(n)
        expect(Object.is(n, -0)).toBe(false)
      }
    }
  })
})

describe('sceneCenter: dónde queda el centro de una planta en la escena', () => {
  it('es el centro de la caja que envuelve a sus muros (las definiciones usan coordenadas desde la esquina)', () => {
    const level = { walls: [{ id: 'a', from: [1, 1], to: [5, 1] }, { id: 'b', from: [5, 1], to: [5, 4] }] } as unknown as LevelDef
    expect(sceneCenter(level)).toEqual([3, 2.5])
  })
})

type SceneNode = { type: string; name?: string; start?: [number, number]; end?: [number, number]; elevation?: number }

describe('sceneCameraPose: la cámara en las coordenadas de la escena de Pascal', () => {
  const sceneOf = (width: number, depth: number, photo: PhotoCamera) => {
    const analysis = planOf([], { room: { width_m: width, depth_m: depth }, camera: photo })
    const definition = analysisToDefinition(analysis, () => undefined)
    const nodes = Object.values(buildLabEnvelope(definition, new Map()).graph.nodes) as SceneNode[]
    const room = { width, depth }
    return { definition, room, pose: sceneCameraPose(photoCameraPose(room, photo), definition), walls: nodes.filter((n) => n.type === 'wall'), slab: nodes.find((n) => n.type === 'slab') }
  }

  it.each([[4, 3], [6, 4.5], [5.3, 3.975], [3.2, 7]])('la escena queda centrada en el origen y la cámara adentro (ambiente %s × %s)', (width, depth) => {
    const { room, pose, walls } = sceneOf(width as number, depth as number, camera(width / 2, depth, width / 2, 0))
    const points = walls.flatMap((wall) => [wall.start, wall.end]).filter((p): p is [number, number] => p !== undefined)
    expect(Math.max(...points.map((p) => p[0]))).toBeCloseTo(room.width / 2, 2)
    expect(Math.min(...points.map((p) => p[0]))).toBeCloseTo(-room.width / 2, 2)
    expect(Math.max(...points.map((p) => p[1]))).toBeCloseTo(room.depth / 2, 2)
    expect(Math.min(...points.map((p) => p[1]))).toBeCloseTo(-room.depth / 2, 2)
    // La cámara estaba pegada al muro sur: queda a 0,2 m de su cara interior (el muro mide 0,2 m) y centrada.
    const near = walls.find((wall) => wall.name === 'Muro sur')
    expect(near?.start?.[1]).toBeCloseTo(room.depth / 2, 2)
    expect(pose.position[2]).toBeCloseTo((near?.start?.[1] ?? 0) - 0.1 - 0.2, 2)
    expect(pose.position[0]).toBe(0)
    expect(pose.target[0]).toBe(0)
    expect(pose.target[2]).toBeLessThan(pose.position[2])
  })

  it('las alturas se miden sobre el piso: la losa del ambiente está a 0,05 m del plano de la planta', () => {
    const { pose, slab } = sceneOf(4, 3, camera(2, 3, 2, 0))
    expect(slab?.elevation).toBe(FLOOR_TOP_M)
    expect(pose.position[1] - FLOOR_TOP_M).toBeCloseTo(EYE_HEIGHT_M, 6)
    expect(pose.target[1] - FLOOR_TOP_M).toBeCloseTo(TARGET_HEIGHT_M, 6)
  })

  it('con un ambiente de 4 × 3 m y la cámara al sur: en (0; 1,55; 1,2) y mirando hacia (0; 0,75; -0,74), con 60° de campo de visión', () => {
    const { pose } = sceneOf(4, 3, camera(2, 3, 2, 0))
    expect(pose.position).toEqual([0, 1.55, 1.2])
    expect(pose.target[0]).toBe(0)
    expect(pose.target[1]).toBe(0.75)
    expect(pose.target[2]).toBeCloseTo(-1.5, 3) // el punto de mira (z = 0, el muro norte) está a 2,7 m: el objetivo queda allí
    expect(pose.fov).toBe(60)
  })

  it('traslada la pose entera sin cambiar la distancia ni el sentido en que mira', () => {
    const { definition, room } = sceneOf(5, 4, camera(1, 3.5, 4, 0.5))
    const local = photoCameraPose(room, camera(1, 3.5, 4, 0.5))
    const world = sceneCameraPose(local, definition)
    const diff = (a: CameraPose, b: CameraPose) => sub(a.target, a.position).map((n, i) => n - (sub(b.target, b.position)[i] ?? 0))
    for (const n of diff(local, world)) expect(Math.abs(n)).toBeLessThan(1e-9)
  })

  it('redondea al milímetro y no deja un -0', () => {
    for (const width of [3.333, 5.123, 7.777]) {
      const { pose } = sceneOf(width, width * 0.75, camera(width / 3, width * 0.75, width / 2, 0))
      for (const n of [...pose.position, ...pose.target]) {
        expect(Math.round(n * 1000) / 1000).toBe(n)
        expect(Object.is(n, -0)).toBe(false)
      }
    }
  })
})

describe('photoSceneCamera: la cámara con la que abre el editor', () => {
  it.each([[camera(2, 3, 2, 0)], [camera(0, 0, 4, 3)], [camera(5, 2, 0, 2, 75)], [camera(1.5, 3.8, 3, 1)]])('es la de la foto, en las coordenadas de la escena de su definición (%o)', (photo) => {
    const definition = analysisToDefinition(planOf([], { room: { width_m: 5, depth_m: 3.5 }, camera: photo }), () => undefined)
    expect(photoSceneCamera(photo, definition)).toEqual(sceneCameraPose(photoCameraPose({ width: 5, depth: 3.5 }, photo), definition))
  })

  it('toma el ambiente de la propia definición (su primer ambiente), sin que haya que repetirlo', () => {
    const photo = camera(1.6, 6.8, 1.6, 0)
    const definition = analysisToDefinition(planOf([], { room: { width_m: 3.2, depth_m: 7 }, camera: photo }), resolve)
    expect(photoSceneCamera(photo, definition).position).toEqual([0, 1.55, 3.2]) // z = 6,8 → 6,7 (0,3 del muro) − 3,5 de centro
  })
})
