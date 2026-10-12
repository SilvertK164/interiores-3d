import { describe, expect, it } from 'vitest'
import { fitScale } from '../src/lib/export/fit'
import { sheetFor } from '../src/lib/export/sheet'
import {
  TEXT,
  fitSummary,
  generatingText,
  levelPagerText,
  moreText,
  noFitMessage,
  previewCaption,
  projectTitle,
  scaleDisabledReason,
  scaleText,
  sheetOf,
  skippedImagesText,
} from '../src/lib/export/texts-es'

const ENGLISH = /\b(floor|level|levels|schedules?|construction|sheet|project|author|download|cancel|preview|scale|print|export|title|date|north|legend|more|page|loading|error|warning)\b/i

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

describe('textos en castellano (criterio 12)', () => {
  const HOUSE = { widthM: 7.8, heightM: 3.8 }
  const a4 = sheetFor('A4', 'landscape')

  it('ningún texto fijo trae palabras en inglés ni emojis', () => {
    for (const text of strings(TEXT)) {
      expect(text, text).not.toMatch(ENGLISH)
      expect(text, text).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })

  it('los textos que se arman tampoco', () => {
    const samples = [
      generatingText(1, 2),
      fitSummary(fitScale(HOUSE, a4, 50)),
      scaleDisabledReason(25, 'A4', fitScale(HOUSE, a4, 25), 50),
      scaleDisabledReason(25, 'A4', fitScale(HOUSE, a4, 25), null),
      noFitMessage('A4'),
      noFitMessage('A3'),
      skippedImagesText(1),
      skippedImagesText(4),
      sheetOf(2, 3),
      previewCaption('A3', 'landscape', 420, 297, 25),
      levelPagerText('Planta baja', 0, 2),
      scaleText(50),
      moreText(3),
      projectTitle('Casa Alvear'),
    ]
    for (const text of samples) expect(text, text).not.toMatch(ENGLISH)
  })

  it('los mensajes de error son los del spec (5.4)', () => {
    expect(TEXT.errors.nothing).toBe('Aún no hay nada que dibujar. Traza muros o ambientes y vuelve a intentarlo.')
    expect(TEXT.errors.failed).toBe('No pudimos generar el PDF. Inténtalo de nuevo.')
    expect(TEXT.errors.cancelled).toBe('Cancelaste la exportación.')
    expect(skippedImagesText(1)).toBe('No se pudo dibujar 1 mueble; el resto del plano sí está en el PDF.')
    expect(skippedImagesText(3)).toBe('No se pudieron dibujar 3 muebles; el resto del plano sí está en el PDF.')
  })

  it('el mensaje de cabida dice cuánto de la hoja usa y en qué eje', () => {
    expect(fitSummary(fitScale(HOUSE, a4, 50))).toBe('Cabe en la hoja · usa 64 % del ancho')
    expect(fitSummary(fitScale({ widthM: 2, heightM: 14 }, a4, 100))).toBe('Cabe en la hoja · usa 97 % del alto')
  })

  it('el motivo de una escala deshabilitada dice cuánto necesita, cuánto ofrece la hoja y cuál es el mejor ajuste', () => {
    expect(scaleDisabledReason(25, 'A4', fitScale(HOUSE, a4, 25), 50)).toBe(
      '1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm. Mejor ajuste: 1:50.',
    )
    expect(scaleDisabledReason(25, 'A4', fitScale(HOUSE, a4, 25), null)).toBe(
      '1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm.',
    )
  })

  it('cuando no cabe en ninguna escala el mensaje nombra 1:100 y lo que se puede hacer', () => {
    expect(noFitMessage('A4')).toBe('El proyecto no cabe en esta hoja ni a 1:100. Prueba con A3 o quita plantas.')
    expect(noFitMessage('A3')).toBe('El proyecto no cabe en esta hoja ni a 1:100. Prueba con otra orientación o quita plantas.')
  })

  it('el progreso, la hoja y la leyenda', () => {
    expect(generatingText(1, 2)).toBe('Generando planta 1 de 2…')
    expect(sheetOf(1, 2)).toBe('Hoja 1 de 2')
    expect(moreText(3)).toBe('y 3 más')
    expect(scaleText(50)).toBe('1:50')
    expect(previewCaption('A3', 'landscape', 420, 297, 25)).toBe('Vista previa · A3 apaisada (420 × 297 mm) · 1:25')
    expect(levelPagerText('Planta baja', 0, 2)).toBe('Planta baja · 1 de 2')
    expect(projectTitle('Casa Alvear')).toBe('Casa Alvear — planos')
  })
})
