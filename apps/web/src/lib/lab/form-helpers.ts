import { LabError } from './lab-error'

/**
 * Ancho conocido del ambiente tal como lo escribe la persona ("4", "4,5" o "4.5"). Vacío significa que no lo sabe (`null`).
 * El rango es el del contrato de la API: mayor que 0 y hasta 100 metros.
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

const pad = (n: number) => String(n).padStart(2, '0')

/** "Desde una foto · 11/10/2026 15:04" con la hora local: el nombre del proyecto que crea «Escena desde una foto»; `label` agrega una etiqueta antes de la fecha. */
export function labProjectName(date: Date, label?: string): string {
  const stamp = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  return ['Desde una foto', label, stamp].filter(Boolean).join(' · ')
}
