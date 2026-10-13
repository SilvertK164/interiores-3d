import { describe, expect, it, vi } from 'vitest'
import type { CameraPose } from '../src/lib/lab/photo-camera'
import { photoCameraKey, savePhotoCamera, takePhotoCamera } from '../src/lib/lab/photo-camera-handoff'

// La cámara de la foto viaja de la página «Escena desde una foto» al editor por sessionStorage: la página la guarda para el proyecto
// nuevo justo antes de navegar y el editor la toma UNA vez (la lee y borra la clave). Si el almacenamiento falla, el editor abre normal.

const ID = '0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'
const POSE: CameraPose = { position: [0, 1.55, 1.2], target: [0, 0.75, -0.742], fov: 60 }

/** Un `sessionStorage` de mentira (un `Map`). */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
    removeItem: vi.fn((key: string) => void data.delete(key)),
  }
}

describe('photoCameraKey', () => {
  it('es madori:photo-camera:<id del proyecto>', () => {
    expect(photoCameraKey(ID)).toBe(`madori:photo-camera:${ID}`)
  })
})

describe('savePhotoCamera', () => {
  it('guarda la pose bajo la clave del proyecto', () => {
    const storage = fakeStorage()
    expect(savePhotoCamera(ID, POSE, () => storage)).toBe(true)
    expect(JSON.parse(storage.data.get(photoCameraKey(ID)) ?? 'null')).toEqual(POSE)
  })

  it('solo guarda la posición, el objetivo y el campo de visión', () => {
    const storage = fakeStorage()
    savePhotoCamera(ID, { ...POSE, extra: 1 } as CameraPose, () => storage)
    expect(Object.keys(JSON.parse(storage.data.get(photoCameraKey(ID)) ?? '{}')).sort()).toEqual(['fov', 'position', 'target'])
  })

  it('si el almacenamiento falla (cuota, modo privado, bloqueado) no lanza y dice que no guardó', () => {
    const full = { ...fakeStorage(), setItem: vi.fn(() => { throw new DOMException('cuota', 'QuotaExceededError') }) }
    expect(savePhotoCamera(ID, POSE, () => full)).toBe(false)
    expect(savePhotoCamera(ID, POSE, () => { throw new DOMException('bloqueado', 'SecurityError') })).toBe(false)
  })

  it('sin almacenamiento (el servidor, o el navegador no lo tiene) tampoco lanza', () => {
    expect(savePhotoCamera(ID, POSE, () => null)).toBe(false)
    expect(savePhotoCamera(ID, POSE)).toBe(false) // en Node no hay window
  })
})

describe('takePhotoCamera', () => {
  it('devuelve la pose guardada y borra la clave: se aplica una sola vez', () => {
    const storage = fakeStorage()
    savePhotoCamera(ID, POSE, () => storage)
    expect(takePhotoCamera(ID, () => storage)).toEqual(POSE)
    expect(storage.data.has(photoCameraKey(ID))).toBe(false)
    expect(takePhotoCamera(ID, () => storage)).toBeNull()
  })

  it('cada proyecto tiene su pose: no toma la de otro', () => {
    const storage = fakeStorage()
    savePhotoCamera(ID, POSE, () => storage)
    expect(takePhotoCamera('otro-proyecto', () => storage)).toBeNull()
    expect(storage.data.has(photoCameraKey(ID))).toBe(true)
  })

  it('sin nada guardado devuelve null y no escribe', () => {
    const storage = fakeStorage()
    expect(takePhotoCamera(ID, () => storage)).toBeNull()
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it.each([
    ['no es JSON', '{no'],
    ['no es un objeto', '42'],
    ['falta el objetivo', JSON.stringify({ position: [0, 1, 2], fov: 60 })],
    ['falta el campo de visión', JSON.stringify({ position: [0, 1, 2], target: [0, 0, 0] })],
    ['el campo de visión es absurdo', JSON.stringify({ position: [0, 1, 2], target: [0, 0, 0], fov: 400 })],
    ['la posición no tiene tres números', JSON.stringify({ position: [0, 1], target: [0, 0, 0], fov: 60 })],
    ['hay un valor que no es un número', JSON.stringify({ position: [0, 'a', 2], target: [0, 0, 0], fov: 60 })],
    ['hay un número infinito (JSON lo guarda como null)', '{"position":[0,1,2],"target":[0,null,0],"fov":60}'],
    ['está absurdamente lejos', JSON.stringify({ position: [0, 1, 1e9], target: [0, 0, 0], fov: 60 })],
  ])('si lo guardado es inválido (%s) devuelve null y borra la clave', (_name, raw) => {
    const storage = fakeStorage({ [photoCameraKey(ID)]: raw })
    expect(takePhotoCamera(ID, () => storage)).toBeNull()
    expect(storage.data.has(photoCameraKey(ID))).toBe(false)
  })

  it('si el almacenamiento falla al leer o al borrar, devuelve null sin lanzar (el editor abre con su encuadre normal)', () => {
    const readFails = { ...fakeStorage(), getItem: vi.fn(() => { throw new DOMException('bloqueado', 'SecurityError') }) }
    expect(takePhotoCamera(ID, () => readFails)).toBeNull()
    const deleteFails = fakeStorage({ [photoCameraKey(ID)]: JSON.stringify(POSE) })
    deleteFails.removeItem.mockImplementation(() => { throw new DOMException('bloqueado', 'SecurityError') })
    expect(takePhotoCamera(ID, () => deleteFails)).toBeNull()
    expect(takePhotoCamera(ID, () => { throw new DOMException('bloqueado', 'SecurityError') })).toBeNull()
    expect(takePhotoCamera(ID, () => null)).toBeNull()
    expect(takePhotoCamera(ID)).toBeNull() // en Node no hay window
  })
})
