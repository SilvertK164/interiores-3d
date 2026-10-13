import { describe, expect, it } from 'vitest'
import { MIN_ROOM_WIDTH_M, analysisToDefinition, photoRoom } from '../src/lib/lab/analysis-to-definition'
import {
  EYE_HEIGHT_M,
  MAX_VIEW_REACH_M,
  NEAR_WALL_GAP_M,
  TARGET_HEIGHT_M,
  type CameraPose,
  type Vec3,
  photoCameraPose,
} from '../src/lib/lab/photo-camera'
import type { DetectedFurniture, RoomAnalysis } from '../src/lib/lab/schema'
import type { LevelDef } from '../src/lib/templates/types'

// El punto de vista de la foto: la cámara del editor abre en el muro cercano (el de y = 1 del análisis), a la altura de los ojos y
// mirando hacia el muro opuesto. Lo que se prueba es la regla y que Pascal pueda cumplirla: sus controles (`custom-camera-controls.tsx`)
// no dejan acercar la cámara a menos de 2 m de su punto de mira ni bajarla de ~5,7° sobre el horizonte; una pose que no cumpla eso se
// corrige sola y deja de ser la de la foto.
const PASCAL_MIN_DISTANCE_M = 2
const PASCAL_MAX_POLAR_RAD = Math.PI / 2 - 0.1

const empty = (): RoomAnalysis => ({ furniture: [], warnings: [], calibration: { status: 'uncalibrated', width_m: null } })
const piece = (over: Partial<DetectedFurniture>): DetectedFurniture => ({
  asset_id: 'sofa',
  x: 0.5,
  y: 0.5,
  width: 0.3,
  depth: 0.2,
  rotation_deg: 0,
  confidence: 0.9,
  ...over,
})

const sub = (a: readonly number[], b: readonly number[]): Vec3 => [(a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0)]
const length = (v: readonly number[]) => Math.hypot(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0)

/** Hacia dónde mira la cámara (unitario), la derecha de la imagen (forward × up, como three.js) y la distancia al punto de mira. */
function view({ position, target }: CameraPose) {
  const delta = sub(target, position)
  const distance = length(delta)
  const forward = delta.map((n) => n / distance) as Vec3
  const right: Vec3 = [-forward[2], 0, forward[0]]
  return { forward, right, distance, polar: Math.acos((position[1] - target[1]) / distance) }
}

/** Lo que el análisis llama (x, y) en una foto, en coordenadas del ambiente: x a la derecha y y = 1 lo más cercano a quien mira. */
const roomPoint = (room: { width: number; depth: number }, x: number, y: number): Vec3 => [x * room.width, 0, y * room.depth]

describe('photoRoom: el ambiente de la foto', () => {
  it('sin ancho conocido mide 4 × 3 m', () => {
    expect(photoRoom()).toEqual({ width: 4, depth: 3 })
    expect(photoRoom(null)).toEqual({ width: 4, depth: 3 })
  })

  it('con el ancho conocido mide ese ancho por el 75 % de fondo', () => {
    expect(photoRoom(6)).toEqual({ width: 6, depth: 4.5 })
    expect(photoRoom(5.3)).toEqual({ width: 5.3, depth: 3.975 })
  })

  it.each([0, -3, Number.NaN])('un ancho %s no sirve: usa los 4 m', (width) => {
    expect(photoRoom(width)).toEqual({ width: 4, depth: 3 })
  })

  it('un ancho demasiado chico sube al mínimo y avisa, con el mismo texto que ve la página', () => {
    const warnings: string[] = []
    expect(photoRoom(0.4, (message) => warnings.push(message))).toEqual({ width: MIN_ROOM_WIDTH_M, depth: 0.75 })
    expect(warnings).toEqual(['El ancho indicado (0,4 m) es demasiado chico para un ambiente: se usó 1 m.'])
    const quiet: string[] = []
    photoRoom(6, (message) => quiet.push(message))
    expect(quiet).toEqual([])
  })

  it.each([undefined, null, 0.4, 1, 2, 4, 5.3, 6, 12.25, 30])('es el ambiente que arma analysisToDefinition (ancho %s)', (width) => {
    const definition = analysisToDefinition(empty(), () => undefined, { knownWidthM: width })
    const room = photoRoom(width)
    expect((definition.levels[0] as LevelDef).rooms[0]?.rect).toEqual([0, 0, room.width, room.depth])
  })
})

describe('photoCameraPose: la cámara en coordenadas del ambiente', () => {
  it('queda centrada, a la altura de los ojos y adentro, pegada al muro cercano (el de y = 1)', () => {
    const { position } = photoCameraPose({ width: 4, depth: 3 })
    expect(position).toEqual([2, EYE_HEIGHT_M, 3 - NEAR_WALL_GAP_M])
    expect(EYE_HEIGHT_M).toBe(1.5)
  })

  it('mira hacia el muro opuesto (el de y = 0), derecho, a un metro de altura', () => {
    const { position, target } = photoCameraPose({ width: 4, depth: 3 })
    expect(target[0]).toBe(position[0])
    expect(target[1]).toBe(TARGET_HEIGHT_M)
    expect(TARGET_HEIGHT_M).toBe(1)
    expect(target[2]).toBeLessThan(position[2])
    expect(view({ position, target }).forward[0]).toBe(0)
  })

  it('en un ambiente hondo el objetivo es el centro del ambiente', () => {
    expect(photoCameraPose({ width: 8, depth: 6 }).target).toEqual([4, 1, 3])
  })

  it('en uno chico el objetivo pasa el centro: a menos de 2 m de distancia Pascal movería la cámara', () => {
    const pose = photoCameraPose({ width: 4, depth: 3 })
    expect(pose.target[2]).toBeLessThan(1.5)
    expect(view(pose).distance).toBeGreaterThanOrEqual(PASCAL_MIN_DISTANCE_M)
  })

  it('en uno enorme no mira más lejos de lo que Pascal deja', () => {
    const pose = photoCameraPose({ width: 20, depth: 15 })
    expect(pose.position[2] - pose.target[2]).toBeCloseTo(MAX_VIEW_REACH_M, 6)
    expect(view(pose).polar).toBeLessThanOrEqual(PASCAL_MAX_POLAR_RAD)
  })

  it('la imagen conserva el orden de la foto: y = 1 queda más cerca que y = 0 y x = 1 a la derecha de x = 0', () => {
    const room = photoRoom()
    const pose = photoCameraPose(room)
    const { forward, right } = view(pose)
    const from = (x: number, y: number) => sub(roomPoint(room, x, y), pose.position)
    const dot = (a: readonly number[], b: readonly number[]) => (a[0] ?? 0) * (b[0] ?? 0) + (a[2] ?? 0) * (b[2] ?? 0)
    // y = 0 (el fondo) está delante de la cámara, y = 1 (el muro de quien mira) queda detrás o al lado de ella.
    expect(dot(forward, from(0.5, 0))).toBeGreaterThan(dot(forward, from(0.5, 1)))
    expect(dot(forward, from(0.5, 0))).toBeGreaterThan(0)
    expect(dot(right, from(1, 0.5))).toBeGreaterThan(0)
    expect(dot(right, from(0, 0.5))).toBeLessThan(0)
  })

  it('un mueble que el análisis puso a la derecha de la foto queda a la derecha de la imagen', () => {
    const room = photoRoom()
    const pose = photoCameraPose(room)
    const { right } = view(pose)
    const at = (x: number) => {
      const definition = analysisToDefinition(
        { ...empty(), furniture: [piece({ x, y: 0.5 })] },
        () => ({ id: 'sofa', name: 'Sofa', dimensions: [1, 0.8, 0.8] }),
      )
      return (definition.levels[0] as LevelDef).items[0]?.at ?? [0, 0]
    }
    const side = (x: number) => (at(x)[0] - pose.position[0]) * right[0] + (at(x)[1] - pose.position[2]) * right[2]
    expect(side(0.85)).toBeGreaterThan(0)
    expect(side(0.15)).toBeLessThan(0)
  })

  it('barrido de anchos: siempre adentro del ambiente, centrada, y con una pose que Pascal no corrige', () => {
    for (let width = MIN_ROOM_WIDTH_M; width <= 30; width += 0.25) {
      const room = photoRoom(width)
      const pose = photoCameraPose(room)
      const { distance, polar, forward } = view(pose)
      const label = `ancho ${width}`
      expect(pose.position[0], label).toBe(room.width / 2)
      expect(pose.position[2], label).toBeGreaterThan(0)
      expect(pose.position[2], label).toBeLessThan(room.depth)
      expect(pose.position[1], label).toBe(EYE_HEIGHT_M)
      expect(distance, label).toBeGreaterThanOrEqual(PASCAL_MIN_DISTANCE_M)
      expect(polar, label).toBeLessThanOrEqual(PASCAL_MAX_POLAR_RAD)
      expect(forward[2], label).toBeLessThan(0)
    }
  })

  it('redondea al milímetro y no deja un -0', () => {
    for (const width of [3.333, 5.123, 7.777]) {
      for (const n of [...photoCameraPose(photoRoom(width)).position, ...photoCameraPose(photoRoom(width)).target]) {
        expect(Math.round(n * 1000) / 1000).toBe(n)
        expect(Object.is(n, -0)).toBe(false)
      }
    }
  })
})
