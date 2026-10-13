import type { FitResult } from './fit'
import { formatMeters } from './scale-bar'
import { paperLabel } from './sheet'
import type { Orientation, PaperSize, Scale } from './types'

/** Todos los textos fijos del diálogo "Exportar plano" y del PDF: castellano neutro con tuteo y sin lenguaje técnico. */
export const TEXT = {
  title: 'Exportar plano',
  subtitle: 'PDF con escala, cotas y cajetín listo para imprimir.',
  paper: 'Hoja',
  orientation: 'Orientación',
  landscape: 'Apaisada',
  portrait: 'Vertical',
  suggested: 'Sugerida',
  scale: 'Escala',
  mode: 'Modo',
  modePaper: 'Papel',
  modePaperHint: 'Blanco y negro, para imprimir',
  modeColor: 'Color',
  modeColorHint: 'Ambientes y materiales, para presentar',
  levels: 'Plantas',
  emptyLevel: '(vacía)',
  titleBlock: 'Incluir cajetín',
  titleBlockHint: 'Proyecto, escala, fecha y autor',
  isometric: 'Incluir vistas isométricas',
  isometricHint: 'Una hoja por planta, sin escala, con su cajetín',
  cancel: 'Cancelar',
  close: 'Cerrar',
  download: 'Descargar PDF',
  measuring: 'Midiendo tu proyecto…',
  updatingPreview: 'Actualizando la vista previa…',
  previewUnavailable: 'No pudimos mostrar la vista previa, pero puedes descargar el PDF igual.',
  previewLabel: 'Vista previa',
  previewAlt: 'Vista previa de la hoja del plano con el cajetín y el norte',
  previousLevel: 'Planta anterior',
  nextLevel: 'Planta siguiente',
  levelsMin: 'Tiene que quedar al menos una planta marcada.',
  emptyLevelHint: 'Esta planta no tiene nada dibujado.',
  suggestedHint: 'Es la que permite la escala más grande.',
  errors: {
    nothing: 'Aún no hay nada que dibujar. Traza muros o ambientes y vuelve a intentarlo.',
    failed: 'No pudimos generar el PDF. Inténtalo de nuevo.',
    cancelled: 'Cancelaste la exportación.',
  },
  pdf: {
    project: 'Proyecto',
    level: 'Planta',
    scale: 'Escala',
    noScale: 'Sin escala',
    isometricSuffix: 'Isométrico',
    date: 'Fecha',
    author: 'Autor',
    north: 'N',
    legend: 'Leyenda',
    noZones: 'Sin ambientes dibujados',
    floor: 'Piso',
    titleSuffix: 'planos',
    creator: 'Madori',
  },
} as const

export const generatingText = (done: number, total: number): string => `Generando planta ${done} de ${total}…`

/** "Cabe en la hoja · usa 64 % del ancho". */
export function fitSummary(result: FitResult): string {
  return `Cabe en la hoja · usa ${result.percent} % del ${result.axis === 'width' ? 'ancho' : 'alto'}`
}

export const scaleText = (scale: Scale): string => `1:${scale}`

/** Lo que significa la escala elegida: "1 cm en el papel = 0,5 m real" (lámina 19). */
export const scaleEquivalence = (scale: Scale): string => `1 cm en el papel = ${formatMeters(scale / 100)} real`

/** El motivo por el que una escala está deshabilitada, con el mejor ajuste si lo hay. */
export function scaleDisabledReason(scale: Scale, paper: PaperSize, result: FitResult, best: Scale | null): string {
  const width = result.axis === 'width'
  const needed = Math.round(width ? result.neededMm.width : result.neededMm.height)
  const usable = Math.round(width ? result.usableMm.width : result.usableMm.height)
  const base = `${scaleText(scale)} no cabe en ${paper}: necesita ${needed} mm de ${width ? 'ancho' : 'alto'} y la hoja ofrece ${usable} mm.`
  return best === null ? base : `${base} Mejor ajuste: ${scaleText(best)}.`
}

/** Cuando ninguna escala cabe: el edificio no cabe ni a 1:100. */
export function noFitMessage(paper: PaperSize): string {
  const way = paper === 'A4' ? 'Prueba con A3' : 'Prueba con otra orientación'
  return `El proyecto no cabe en esta hoja ni a 1:100. ${way} o quita plantas.`
}

export function skippedImagesText(count: number): string {
  return count === 1
    ? 'No se pudo dibujar 1 mueble; el resto del plano sí está en el PDF.'
    : `No se pudieron dibujar ${count} muebles; el resto del plano sí está en el PDF.`
}

export const sheetOf = (n: number, total: number): string => `Hoja ${n} de ${total}`

export function previewCaption(paper: PaperSize, orientation: Orientation, widthMm: number, heightMm: number, scale: Scale | null): string {
  return `Vista previa · ${paperLabel(paper, orientation)} (${widthMm} × ${heightMm} mm) · ${scale === null ? 'sin escala' : scaleText(scale)}`
}

/** Paginador de la vista previa: "Planta baja · 1 de 2". */
export const levelPagerText = (label: string, index: number, total: number): string => `${label} · ${index + 1} de ${total}`

/** Última fila de una leyenda que no entra. */
export const moreText = (count: number): string => `y ${count} más`

/** Título del documento PDF: "Casa Alvear — planos". */
export const projectTitle = (name: string): string => `${name} — ${TEXT.pdf.titleSuffix}`
