const AREA = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** "15,2 m²": coma decimal, un decimal y un espacio, como la maqueta (`formatAreaLabel` de Pascal devuelve "15.2m²"). */
export function formatArea(squareMeters: number): string {
  return `${AREA.format(Number.isFinite(squareMeters) ? squareMeters : 0)} m²`
}
