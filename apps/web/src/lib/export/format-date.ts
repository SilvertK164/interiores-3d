const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "12 de octubre de 2026" (hora local). Una fecha inválida da texto vacío. */
export function formatLongDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getDate()} de ${MONTHS[date.getMonth()] ?? ''} de ${date.getFullYear()}`
}
