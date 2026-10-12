import { describe, expect, it } from 'vitest'
import {
  type ExportState,
  currentSheet,
  exportReducer,
  fitInfo,
  initialState,
  scaleOptions,
  suggestedOrientation,
} from '../src/editor/shell/export-plan-model'
import type { PlanLevel } from '../src/lib/export/types'

const GROUND: PlanLevel = { id: 'a', label: 'Planta baja', widthM: 7.8, heightM: 3.8, empty: false }
const UPPER: PlanLevel = { id: 'b', label: 'Planta 1', widthM: 6, heightM: 3, empty: false }
const ATTIC: PlanLevel = { id: 'c', label: 'Altillo', widthM: 0, heightM: 0, empty: true }

const measured = (levels: PlanLevel[]): ExportState => exportReducer(exportReducer(initialState, { type: 'open' }), { type: 'measured', levels })
const reduce = (state: ExportState, ...actions: Parameters<typeof exportReducer>[1][]) => actions.reduce(exportReducer, state)

describe('apertura y medición', () => {
  it('empieza quieto, "open" pasa a medir y "measured" deja todo listo con las plantas no vacías marcadas', () => {
    expect(initialState.status).toBe('idle')
    expect(exportReducer(initialState, { type: 'open' }).status).toBe('measuring')
    const state = measured([GROUND, UPPER, ATTIC])
    expect(state.status).toBe('ready')
    expect(state.form.checked).toEqual(['a', 'b'])
    expect(state.form.paper).toBe('A4')
    expect(state.form.mode).toBe('paper')
    expect(state.form.titleBlock).toBe(true)
  })

  it('el valor inicial es la escala mayor que cabe y la orientación sugerida (A4: 1:50, apaisada)', () => {
    const state = measured([GROUND, UPPER])
    expect(state.form.scale).toBe(50)
    expect(state.form.orientation).toBe('landscape')
  })

  it('si medir falla, se avisa en castellano y no se puede descargar', () => {
    const state = reduce(initialState, { type: 'open' }, { type: 'measureFailed' })
    expect(state.status).toBe('ready')
    expect(state.messageKind).toBe('error')
    expect(state.message).toBe('No pudimos generar el PDF. Inténtalo de nuevo.')
    expect(fitInfo(state).canDownload).toBe(false)
  })
})

describe('escala y hoja (criterio 7)', () => {
  it('en A4 1:25 está deshabilitada con su motivo y 1:50 y 1:100 se pueden elegir; en A3 1:25 se habilita y se elige sola', () => {
    const a4 = measured([GROUND])
    const options = scaleOptions(a4)
    expect(options.map((o) => [o.scale, o.enabled])).toEqual([[25, false], [50, true], [100, true]])
    expect(options[0]?.reason).toBe('1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm. Mejor ajuste: 1:50.')
    expect(options[1]?.reason).toBeNull()
    const a3 = exportReducer(a4, { type: 'paper', value: 'A3' })
    expect(scaleOptions(a3).every((o) => o.enabled)).toBe(true)
    expect(a3.form.scale).toBe(25)
  })

  it('el resumen dice cuánto de la hoja usa (64 % del ancho en A4 a 1:50; 88 % en A3 a 1:25)', () => {
    expect(fitInfo(measured([GROUND])).summary).toBe('Cabe en la hoja · usa 64 % del ancho')
    expect(fitInfo(exportReducer(measured([GROUND]), { type: 'paper', value: 'A3' })).summary).toBe('Cabe en la hoja · usa 88 % del ancho')
  })

  it('elegir una escala que no cabe no hace nada; elegir una que cabe la fija aunque cambie la hoja', () => {
    const a4 = measured([GROUND])
    expect(exportReducer(a4, { type: 'scale', value: 25 })).toBe(a4)
    const picked = reduce(a4, { type: 'scale', value: 100 }, { type: 'paper', value: 'A3' })
    expect(picked.form.scale).toBe(100)
  })

  it('si la escala elegida deja de caber (más plantas, otra hoja) pasa a la mayor que sí cabe', () => {
    // En A3 la escala sale sola en 1:25; se elige 1:100 y de nuevo 1:25 para que la persona la haya fijado a mano.
    const a3 = reduce(measured([GROUND]), { type: 'paper', value: 'A3' }, { type: 'scale', value: 100 }, { type: 'scale', value: 25 })
    expect(a3.form.scale).toBe(25)
    expect(a3.touched.scale).toBe(true)
    const a4 = exportReducer(a3, { type: 'paper', value: 'A4' })
    expect(a4.form.scale).toBe(50)
  })

  it('la orientación sugerida sigue al edificio hasta que la persona elige una', () => {
    const tall: PlanLevel = { id: 't', label: 'Torre', widthM: 4, heightM: 12, empty: false }
    const state = measured([tall])
    expect(state.form.orientation).toBe('portrait')
    expect(suggestedOrientation(state)).toBe('portrait')
    const manual = exportReducer(state, { type: 'orientation', value: 'landscape' })
    expect(manual.form.orientation).toBe('landscape')
    expect(exportReducer(manual, { type: 'paper', value: 'A3' }).form.orientation).toBe('landscape')
  })

  it('sin cajetín el área útil crece y la hoja tiene banda de 16 mm', () => {
    const state = exportReducer(measured([GROUND]), { type: 'titleBlock', value: false })
    expect(currentSheet(state).bandMm).toBe(16)
  })
})

describe('lo que no se puede exportar (Review Focus 1 y 3)', () => {
  it('con todas las plantas vacías dice que no hay nada que dibujar y no se puede descargar', () => {
    const state = measured([ATTIC])
    const info = fitInfo(state)
    expect(info.problem).toBe('nothing')
    expect(info.summary).toBe('Aún no hay nada que dibujar. Traza muros o ambientes y vuelve a intentarlo.')
    expect(info.canDownload).toBe(false)
  })

  it('un edificio que no cabe en ninguna escala deshabilita las tres, lo dice y no se puede descargar', () => {
    const market: PlanLevel = { id: 'm', label: 'Planta baja', widthM: 40, heightM: 30, empty: false }
    const state = measured([market])
    expect(scaleOptions(state).every((o) => !o.enabled)).toBe(true)
    const info = fitInfo(state)
    expect(info.problem).toBe('nofit')
    expect(info.best).toBeNull()
    expect(info.summary).toBe('El proyecto no cabe en esta hoja ni a 1:100. Prueba con A3 o quita plantas.')
    expect(info.canDownload).toBe(false)
    // El eje más justo es el alto: (30 + 1) × 1000 / 25 = 1240 mm contra 154 mm. Sin mejor ajuste, el motivo termina ahí.
    expect(scaleOptions(state)[0]?.reason).toBe('1:25 no cabe en A4: necesita 1240 mm de alto y la hoja ofrece 154 mm.')
  })

  it('en A3 el mensaje sugiere otra orientación en lugar de A3', () => {
    const market: PlanLevel = { id: 'm', label: 'Planta baja', widthM: 90, heightM: 80, empty: false }
    const state = exportReducer(measured([market]), { type: 'paper', value: 'A3' })
    expect(fitInfo(state).summary).toBe('El proyecto no cabe en esta hoja ni a 1:100. Prueba con otra orientación o quita plantas.')
  })
})
