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
