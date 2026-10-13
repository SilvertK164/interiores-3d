const AREA = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const METERS = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const meters = (value: number) => METERS.format(Number.isFinite(value) ? value : 0)

/** "0,90 m": coma decimal y dos decimales, como los campos de propiedades de la maqueta. */
export function formatMeters(value: number): string {
  return `${meters(value)} m`
}

/** "2,06 × 1,01 m" (ancho × fondo), como las tarjetas de muebles de la maqueta. */
export function formatSize(width: number, depth: number): string {
  return `${meters(width)} × ${meters(depth)} m`
}

/** "15,2 m²": coma decimal, un decimal y un espacio, como la maqueta (`formatAreaLabel` de Pascal devuelve "15.2m²"). */
export function formatArea(squareMeters: number): string {
  return `${AREA.format(Number.isFinite(squareMeters) ? squareMeters : 0)} m²`
}

const FILE_SIZE = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false })

/** "512 B", "1,5 KB", "2,4 MB": el peso de un archivo para la vista previa de una foto (coma decimal; 1 KB = 1024 bytes). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${FILE_SIZE.format(bytes / 1024)} KB`
  return `${FILE_SIZE.format(bytes / (1024 * 1024))} MB`
}
