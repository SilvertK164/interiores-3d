const SUFFIX = '-planos.pdf'
const MAX_LENGTH = 80

/**
 * Nombre del archivo que se descarga: `<proyecto>-planos.pdf` (criterio 3). Solo letras y números sin tildes, separados por
 * guiones; nunca vacío, nunca más de 80 caracteres y nunca con los caracteres que Windows, macOS o Linux prohíben.
 */
export function exportFileName(projectName: string, suffix = SUFFIX): string {
  const base = projectName
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH - suffix.length)
    .replace(/-+$/g, '')
  return `${base || 'proyecto'}${suffix}`
}

/** Nombre de la imagen 3D: `<proyecto>-isometrico.png`, con las mismas reglas que el del PDF. */
export function imageFileName(projectName: string): string {
  return exportFileName(projectName, '-isometrico.png')
}
