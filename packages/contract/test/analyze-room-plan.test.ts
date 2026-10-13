import { describe, expect, it } from 'vitest'
import {
  CAMERA_FOV_DEFAULT_DEG,
  CAMERA_FOV_MAX_DEG,
  CAMERA_FOV_MIN_DEG,
  CAMERA_MAX_OUTSIDE_M,
  DetectedFurnitureSchema,
  PhotoCameraSchema,
  ROOM_MAX_M,
  ROOM_MIN_M,
  RoomAnalysisSchema,
  RoomOpeningSchema,
  RoomSizeSchema,
  WALL_SIDES,
} from '../src/index.js'

// El plano que devuelve POST /v1/analyze-room (contrato v2): el ambiente, desde dónde se tomó la foto, las puertas y ventanas y cada
// mueble en metros. Estas pruebas fijan los rangos y las reglas entre campos (la cámara cerca del rectángulo, `on_top_of` sin ciclos).

const accepts = (schema: { safeParse(v: unknown): { success: boolean } }, value: unknown) => schema.safeParse(value).success
const piece = (extra: object = {}) => ({ asset_id: 'sofa', x_m: 1.6, z_m: 5, facing_deg: 180, against_wall: null, on_top_of: null, confidence: 0.9, ...extra })
const room = (extra: object = {}) => ({ width_m: 3.2, depth_m: 7, ...extra })
const camera = (extra: object = {}) => ({ x_m: 1.6, z_m: 6.8, look_at: { x_m: 1.6, z_m: 0 }, ...extra })
const opening = (extra: object = {}) => ({ type: 'window', wall: 'e', at_m: 2, width_m: 1.4, ...extra })
const plan = (extra: object = {}) => ({ room: room(), camera: camera(), openings: [opening()], furniture: [piece()], warnings: ['La planta está tapada por el sofá.'], ...extra })
const issuesOf = (value: unknown) => RoomAnalysisSchema.safeParse(value).error?.issues ?? []

describe('constantes del plano', () => {
  it('el ambiente mide de 1,5 a 12 m por lado y la cámara puede salir 1 m del rectángulo', () => {
    expect([ROOM_MIN_M, ROOM_MAX_M, CAMERA_MAX_OUTSIDE_M]).toEqual([1.5, 12, 1])
  })

  it('el campo de visión va de 30° a 100° y, si falta, vale 60°', () => {
    expect([CAMERA_FOV_MIN_DEG, CAMERA_FOV_MAX_DEG, CAMERA_FOV_DEFAULT_DEG]).toEqual([30, 100, 60])
  })

  it('los muros son norte, sur, este y oeste', () => {
    expect([...WALL_SIDES].sort()).toEqual(['e', 'n', 's', 'w'])
  })
})

describe('RoomSize (el ambiente)', () => {
  it('es un rectángulo de ancho (oeste a este) y fondo (norte a sur) de 1,5 a 12 m', () => {
    for (const ok of [{}, { width_m: 1.5 }, { width_m: 12 }, { depth_m: 1.5 }, { depth_m: 12 }]) {
      expect(accepts(RoomSizeSchema, room(ok)), JSON.stringify(ok)).toBe(true)
    }
    for (const bad of [{ width_m: 1.49 }, { width_m: 12.01 }, { depth_m: 0 }, { depth_m: -3 }, { width_m: Number.NaN }, { depth_m: '7' }, { width_m: null }]) {
      expect(accepts(RoomSizeSchema, room(bad)), JSON.stringify(bad)).toBe(false)
    }
  })

  it('exige las dos medidas', () => {
    expect(accepts(RoomSizeSchema, { width_m: 3 })).toBe(false)
    expect(accepts(RoomSizeSchema, { depth_m: 3 })).toBe(false)
  })
})

describe('PhotoCamera (desde dónde se tomó la foto)', () => {
  it('trae su posición y el punto del plano al que mira el centro de la foto; el campo de visión es opcional', () => {
    expect(accepts(PhotoCameraSchema, camera())).toBe(true)
    expect(PhotoCameraSchema.parse(camera()).fov_deg).toBeUndefined()
    expect(PhotoCameraSchema.parse(camera({ fov_deg: 75 })).fov_deg).toBe(75)
  })

  it('el campo de visión va de 30° a 100°', () => {
    for (const ok of [30, 60, 100]) expect(accepts(PhotoCameraSchema, camera({ fov_deg: ok })), String(ok)).toBe(true)
    for (const bad of [29.9, 100.1, 0, -60, '60', Number.NaN]) expect(accepts(PhotoCameraSchema, camera({ fov_deg: bad })), String(bad)).toBe(false)
  })

  it('exige la posición y el punto de mira, con números', () => {
    for (const key of ['x_m', 'z_m', 'look_at']) {
      const { [key]: _omitted, ...rest } = camera() as Record<string, unknown>
      expect(accepts(PhotoCameraSchema, rest), key).toBe(false)
    }
    expect(accepts(PhotoCameraSchema, camera({ look_at: { x_m: 1 } }))).toBe(false)
    expect(accepts(PhotoCameraSchema, camera({ x_m: '1' }))).toBe(false)
  })
})

describe('RoomOpening (puertas y ventanas)', () => {
  it('es una puerta o una ventana en uno de los cuatro muros, con su posición y su ancho', () => {
    for (const type of ['door', 'window']) expect(accepts(RoomOpeningSchema, opening({ type })), type).toBe(true)
    for (const wall of ['n', 's', 'e', 'w']) expect(accepts(RoomOpeningSchema, opening({ wall })), wall).toBe(true)
    for (const bad of [{ type: 'portón' }, { wall: 'x' }, { wall: 'norte' }, { at_m: -0.1 }, { at_m: 12.1 }, { width_m: 0.29 }, { width_m: 6.1 }, { width_m: Number.NaN }]) {
      expect(accepts(RoomOpeningSchema, opening(bad)), JSON.stringify(bad)).toBe(false)
    }
  })
})

describe('DetectedFurniture (un mueble en el plano)', () => {
  it('es un asset_id con su centro en metros, hacia dónde mira, si está contra un muro, sobre qué está apoyado y la confianza', () => {
    const ok = [{}, { x_m: 0 }, { z_m: 12 }, { x_m: -1 }, { z_m: 13 }, { facing_deg: -360 }, { facing_deg: 360 }, { against_wall: 'n' }, { on_top_of: 0 }, { confidence: 0 }, { confidence: 1 }]
    for (const extra of ok) expect(accepts(DetectedFurnitureSchema, piece(extra)), JSON.stringify(extra)).toBe(true)
    const bad = [
      { x_m: -1.01 },
      { x_m: 13.01 },
      { z_m: Number.NaN },
      { facing_deg: 361 },
      { facing_deg: -361 },
      { against_wall: 'norte' },
      { against_wall: undefined },
      { on_top_of: -1 },
      { on_top_of: 1.5 },
      { on_top_of: 100 },
      { on_top_of: undefined },
      { confidence: 1.01 },
      { confidence: -0.1 },
      { asset_id: '' },
      { asset_id: 'a'.repeat(101) },
    ]
    for (const extra of bad) expect(accepts(DetectedFurnitureSchema, piece(extra)), JSON.stringify(extra)).toBe(false)
  })

  it('el formato anterior (proporciones de la imagen) ya no sirve', () => {
    expect(accepts(DetectedFurnitureSchema, { asset_id: 'sofa', x: 0.5, y: 0.5, width: 0.3, depth: 0.2, rotation_deg: 90, confidence: 0.9 })).toBe(false)
  })
})

describe('RoomAnalysis (la respuesta: el plano visto desde arriba)', () => {
  it('acepta un plano completo y uno sin aberturas, muebles ni avisos', () => {
    expect(accepts(RoomAnalysisSchema, plan())).toBe(true)
    expect(accepts(RoomAnalysisSchema, plan({ openings: [], furniture: [], warnings: [] }))).toBe(true)
  })

  it('exige el ambiente, la cámara, las aberturas, los muebles y los avisos', () => {
    for (const key of ['room', 'camera', 'openings', 'furniture', 'warnings']) {
      const { [key]: _omitted, ...rest } = plan() as Record<string, unknown>
      expect(accepts(RoomAnalysisSchema, rest), key).toBe(false)
    }
  })

  it('ya no trae la calibración del contrato anterior: se descarta si llega', () => {
    const parsed = RoomAnalysisSchema.parse({ ...plan(), calibration: { status: 'uncalibrated', width_m: null } })
    expect(Object.keys(parsed)).toEqual(['room', 'camera', 'openings', 'furniture', 'warnings'])
  })

  it('las respuestas del contrato anterior (proporciones de la imagen) se rechazan', () => {
    const old = {
      furniture: [{ asset_id: 'sofa', x: 0.5, y: 0.5, width: 0.3, depth: 0.2, rotation_deg: 0, confidence: 0.9 }],
      warnings: [],
      calibration: { status: 'uncalibrated', width_m: null },
    }
    expect(accepts(RoomAnalysisSchema, old)).toBe(false)
  })

  it('admite hasta 100 muebles y 30 aberturas', () => {
    expect(accepts(RoomAnalysisSchema, plan({ furniture: Array.from({ length: 100 }, () => piece()) }))).toBe(true)
    expect(accepts(RoomAnalysisSchema, plan({ furniture: Array.from({ length: 101 }, () => piece()) }))).toBe(false)
    expect(accepts(RoomAnalysisSchema, plan({ openings: Array.from({ length: 30 }, () => opening()) }))).toBe(true)
    expect(accepts(RoomAnalysisSchema, plan({ openings: Array.from({ length: 31 }, () => opening()) }))).toBe(false)
  })

  describe('la cámara', () => {
    it('puede estar dentro del ambiente, en una esquina o hasta 1 m fuera del rectángulo', () => {
      for (const at of [{ x_m: 0, z_m: 0 }, { x_m: 3.2, z_m: 7 }, { x_m: 1.6, z_m: 7.5 }, { x_m: -1, z_m: 3 }, { x_m: 4.2, z_m: 3 }, { x_m: 1.6, z_m: -1 }, { x_m: 1.6, z_m: 8 }]) {
        expect(accepts(RoomAnalysisSchema, plan({ camera: camera(at) })), JSON.stringify(at)).toBe(true)
      }
    })

    it('a más de 1 m fuera del rectángulo no sirve, y el límite sigue a las medidas del ambiente', () => {
      for (const at of [{ x_m: -1.01 }, { x_m: 4.21 }, { z_m: -1.01 }, { z_m: 8.01 }]) {
        const issues = issuesOf(plan({ camera: camera(at) }))
        expect(issues.length, JSON.stringify(at)).toBeGreaterThan(0)
        expect(issues[0]?.path[0]).toBe('camera')
      }
      expect(accepts(RoomAnalysisSchema, plan({ room: room({ width_m: 5 }), camera: camera({ x_m: 6 }) }))).toBe(true)
      expect(accepts(RoomAnalysisSchema, plan({ room: room({ width_m: 5 }), camera: camera({ x_m: 6.01 }) }))).toBe(false)
    })

    it('el punto al que mira tiene que ser distinto de donde está', () => {
      const same = issuesOf(plan({ camera: camera({ x_m: 1, z_m: 3, look_at: { x_m: 1, z_m: 3 } }) }))
      expect(same[0]?.path).toEqual(['camera', 'look_at'])
      expect(accepts(RoomAnalysisSchema, plan({ camera: camera({ x_m: 1, z_m: 3, look_at: { x_m: 1.02, z_m: 3.02 } }) }))).toBe(false)
      expect(accepts(RoomAnalysisSchema, plan({ camera: camera({ x_m: 1, z_m: 3, look_at: { x_m: 1.1, z_m: 3 } }) }))).toBe(true)
    })
  })

  describe('on_top_of apunta a otro mueble de la misma lista', () => {
    const stack = (...supports: (number | null)[]) => plan({ furniture: supports.map((on_top_of) => piece({ on_top_of })) })

    it('acepta un mueble sobre otro y cadenas sin ciclo', () => {
      expect(accepts(RoomAnalysisSchema, stack(null, 0))).toBe(true)
      expect(accepts(RoomAnalysisSchema, stack(1, null))).toBe(true) // el soporte puede venir después
      expect(accepts(RoomAnalysisSchema, stack(null, 0, 1))).toBe(true)
      expect(accepts(RoomAnalysisSchema, stack(null, 0, 0, 0))).toBe(true) // varios sobre el mismo
    })

    it('rechaza un índice que no existe y señala qué mueble lo trae', () => {
      const issues = issuesOf(stack(null, 2))
      expect(issues).toHaveLength(1)
      expect(issues[0]?.path).toEqual(['furniture', 1, 'on_top_of'])
      expect(accepts(RoomAnalysisSchema, plan({ furniture: [piece({ on_top_of: 0 })] }))).toBe(false) // el único mueble sobre sí mismo
    })

    it('rechaza un mueble apoyado sobre sí mismo', () => {
      const issues = issuesOf(stack(null, 1))
      expect(issues[0]?.path).toEqual(['furniture', 1, 'on_top_of'])
    })

    it('rechaza los ciclos (A sobre B y B sobre A, o una cadena que vuelve a empezar)', () => {
      expect(accepts(RoomAnalysisSchema, stack(1, 0))).toBe(false)
      expect(accepts(RoomAnalysisSchema, stack(2, 0, 1))).toBe(false)
      expect(accepts(RoomAnalysisSchema, stack(null, 2, 3, 1))).toBe(false)
      const issues = issuesOf(stack(1, 0))
      expect(issues.some((issue) => issue.path[0] === 'furniture' && issue.path[2] === 'on_top_of')).toBe(true)
    })
  })
})
