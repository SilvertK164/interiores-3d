import type { CameraPose, Vec3 } from './photo-camera'

/**
 * La cámara de la foto viaja de «Escena desde una foto» al editor por `sessionStorage`: la página la guarda para el proyecto nuevo
 * justo antes de navegar y el editor la toma UNA vez, cuando la escena terminó de cargar (la lee y borra la clave). El almacenamiento
 * puede faltar o fallar (modo privado, cuota, bloqueado): nada de esto lanza, y sin pose el editor abre con su encuadre normal.
 */

export const photoCameraKey = (projectId: string) => `madori:photo-camera:${projectId}`

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type GetStorage = () => StorageLike | null

const sessionStorageOrNull: GetStorage = () => (typeof window === 'undefined' ? null : window.sessionStorage)

/** Más lejos que esto no es una cámara de un ambiente: algo escribió esa clave que no es nuestro. */
const MAX_COORDINATE_M = 1000
/** Campo de visión vertical que acepta una cámara 3D (en grados). */
const FOV_RANGE_DEG = [20, 120] as const

function vec3(value: unknown): Vec3 | null {
  const ok = Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= MAX_COORDINATE_M)
  return ok ? [value[0], value[1], value[2]] : null
}

function parsePose(raw: string): CameraPose | null {
  const value: unknown = JSON.parse(raw)
  if (typeof value !== 'object' || value === null) return null
  const position = vec3((value as { position?: unknown }).position)
  const target = vec3((value as { target?: unknown }).target)
  const fov = (value as { fov?: unknown }).fov
  const fovOk = typeof fov === 'number' && fov >= FOV_RANGE_DEG[0] && fov <= FOV_RANGE_DEG[1]
  return position && target && fovOk ? { position, target, fov } : null
}

/** Guarda la pose (en las coordenadas de la escena) para ese proyecto. Devuelve `false` si no se pudo guardar. */
export function savePhotoCamera(projectId: string, pose: CameraPose, getStorage: GetStorage = sessionStorageOrNull): boolean {
  try {
    const storage = getStorage()
    if (!storage) return false
    storage.setItem(photoCameraKey(projectId), JSON.stringify({ position: pose.position, target: pose.target, fov: pose.fov }))
    return true
  } catch {
    return false
  }
}

/** La pose guardada para ese proyecto, que se borra al leerla (se aplica una sola vez); `null` si no hay, no sirve o el almacenamiento falla. */
export function takePhotoCamera(projectId: string, getStorage: GetStorage = sessionStorageOrNull): CameraPose | null {
  try {
    const storage = getStorage()
    const key = photoCameraKey(projectId)
    const raw = storage?.getItem(key) ?? null
    if (!storage || raw === null) return null
    storage.removeItem(key)
    return parsePose(raw)
  } catch {
    return null
  }
}
