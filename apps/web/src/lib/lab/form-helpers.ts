import { LabError } from './lab-error'

/**
 * Ancho conocido del ambiente tal como lo escribe la persona ("4", "4,5" o "4.5"). Vacío significa que no lo sabe (`null`).
 * El rango es el que acepta TP3: mayor que 0 y hasta 100 metros.
 */
export function parseKnownWidth(text: string): number | null {
  const clean = text.trim()
  if (clean === '') return null
  const value = /^\d+([.,]\d+)?$/.test(clean) ? Number(clean.replace(',', '.')) : Number.NaN
  if (!(value > 0 && value <= 100)) {
    throw new LabError('El ancho conocido tiene que ser un número mayor que 0 y hasta 100 metros (por ejemplo 4,5).', 'ancho_invalido')
  }
  return value
}

/** Dirección del servicio de TP3 sin espacios, barra final, parámetros ni ancla; falla si no es http(s). */
export function normalizeServiceUrl(raw: string): string {
  const invalid = () =>
    new LabError('La dirección del servicio de TP3 no es válida: tiene que empezar con http:// o https://, por ejemplo http://localhost:8000.', 'url_invalida')
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw invalid()
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw invalid()
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "Laboratorio · 11/10/2026 15:04" con la hora local; `label` agrega una etiqueta antes de la fecha. */
export function labProjectName(date: Date, label?: string): string {
  const stamp = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  return ['Laboratorio', label, stamp].filter(Boolean).join(' · ')
}

const URL_KEY = 'lab:tp3-url'
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null // acceder al almacenamiento puede lanzar (ventana privada, datos bloqueados)
  }
}

/** Dirección que la persona usó la última vez, o `null` si no hay o el navegador no deja leerla. */
export function readSavedServiceUrl(storage: StorageLike | null = browserStorage()): string | null {
  try {
    return storage?.getItem(URL_KEY) ?? null
  } catch {
    return null
  }
}

export function saveServiceUrl(url: string, storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.setItem(URL_KEY, url)
  } catch {
    // sin almacenamiento la página funciona igual: solo no recuerda la dirección
  }
}
