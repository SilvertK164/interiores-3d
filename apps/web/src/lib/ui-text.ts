import type { ProjectKind } from '@interiores/contract'

/** Nombre de la plataforma: único lugar donde se escribe (logo, login y título de las páginas). Para cambiarlo, edita esta línea. */
export const APP_NAME = 'Madori'

/** Textos pequeños de la interfaz: funciones puras (la hora actual se pasa como parámetro para poder probarlas). */

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Palabras con letras de la parte local del correo ("silvert.quispe@x.com" → ["silvert", "quispe"]). */
function emailWords(email: string | null | undefined): string[] {
  const local = (email ?? '').split('@')[0] ?? ''
  return local.split(/[^\p{L}]+/u).filter(Boolean)
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()

/** Nombre para el saludo: la primera palabra del correo con la inicial en mayúscula; vacío si no hay letras. */
export function nameFromEmail(email: string | null | undefined): string {
  const first = emailWords(email)[0]
  return first ? capitalize(first) : ''
}

/** Iniciales del avatar: dos palabras → sus iniciales; una palabra → sus dos primeras letras; sin letras → "?". */
export function initialsFromEmail(email: string | null | undefined): string {
  const words = emailWords(email)
  const [first, second] = words
  if (!first) return '?'
  if (second) return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
  return first.slice(0, 2).toUpperCase()
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MINUTE = 60_000
const HOUR = 60 * MINUTE

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/**
 * "hace un momento", "hace 35 min", "hace 2 h", "ayer" o una fecha ("8 de octubre", con el año si es de otro año).
 * Hasta 24 horas atrás cuenta en horas; después, "ayer" si fue el día anterior; antes, la fecha.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'hace tiempo'
  const diff = now.getTime() - then.getTime()
  if (diff < MINUTE) return 'hace un momento'
  if (diff < HOUR) return `hace ${Math.floor(diff / MINUTE)} min`
  if (diff < 24 * HOUR) return `hace ${Math.floor(diff / HOUR)} h`
  const days = Math.round((startOfDay(now) - startOfDay(then)) / (24 * HOUR))
  if (days === 1) return 'ayer'
  const date = `${then.getDate()} de ${MONTHS[then.getMonth()]}`
  return then.getFullYear() === now.getFullYear() ? date : `${date} de ${then.getFullYear()}`
}

/** "Editado hace 2 h", "Editado ayer", "Editado el 8 de octubre". */
export function whenLabel(prefix: string, iso: string, now: Date = new Date()): string {
  const text = relativeTime(iso, now)
  return /^(hace|ayer)/.test(text) ? `${prefix} ${text}` : `${prefix} el ${text}`
}

export const kindLabel = (kind: ProjectKind | null): string =>
  kind === 'vivienda' ? 'Vivienda' : kind === 'comercio' ? 'Comercio' : 'Sin tipo'

export const pluralProjects = (n: number): string => `${n} ${n === 1 ? 'proyecto' : 'proyectos'}`

/** "108 m² · 2 niveles" (los niveles solo si hay más de uno). */
export const templateMeta = (t: { areaM2: number; levels: number }): string =>
  `${t.areaM2} m²${t.levels > 1 ? ` · ${t.levels} niveles` : ''}`
