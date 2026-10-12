import { describe, expect, it } from 'vitest'
import { type ExportState, buildArgs, exportReducer, initialState, previewArgs, selectedLevels } from '../src/editor/shell/export-plan-model'
import type { PlanLevel } from '../src/lib/export/types'

const GROUND: PlanLevel = { id: 'a', label: 'Planta baja', widthM: 7.8, heightM: 3.8, empty: false }
const UPPER: PlanLevel = { id: 'b', label: 'Planta 1', widthM: 6, heightM: 3, empty: false }
const ATTIC: PlanLevel = { id: 'c', label: 'Altillo', widthM: 0, heightM: 0, empty: true }
const META = { projectName: 'Casa Alvear', author: 'Silvert Quispe', date: new Date(2026, 9, 12) }

const measured = (levels: PlanLevel[]): ExportState => exportReducer(exportReducer(initialState, { type: 'open' }), { type: 'measured', levels })
const reduce = (state: ExportState, ...actions: Parameters<typeof exportReducer>[1][]) => actions.reduce(exportReducer, state)

describe('plantas', () => {
  it('una planta vacía no se marca ni se puede marcar; la última marcada no se puede desmarcar', () => {
    const state = measured([GROUND, UPPER, ATTIC])
    expect(exportReducer(state, { type: 'toggleLevel', id: 'c' })).toBe(state)
    const one = exportReducer(state, { type: 'toggleLevel', id: 'b' })
    expect(one.form.checked).toEqual(['a'])
    expect(exportReducer(one, { type: 'toggleLevel', id: 'a' })).toBe(one)
  })

  it('desmarcar la planta más grande libera una escala mayor mientras la persona no haya elegido una', () => {
    const big: PlanLevel = { id: 'big', label: 'Planta baja', widthM: 14, heightM: 5, empty: false }
    const state = measured([big, UPPER])
    expect(state.form.scale).toBe(100)
    expect(exportReducer(state, { type: 'toggleLevel', id: 'big' }).form.scale).toBe(50)
  })

  it('las plantas elegidas salen de la más baja a la más alta, como las midió Pascal', () => {
    const state = measured([GROUND, UPPER])
    expect(selectedLevels(state).map((l) => l.id)).toEqual(['a', 'b'])
    expect(buildArgs(state, META).levelIds).toEqual(['a', 'b'])
  })

  it('la vista previa sigue a una planta marcada y se queda dentro de las marcadas', () => {
    const state = reduce(measured([GROUND, UPPER]), { type: 'previewLevel', index: 5 })
    expect(state.previewIndex).toBe(1)
    const fewer = exportReducer(state, { type: 'toggleLevel', id: 'b' })
    expect(fewer.previewIndex).toBe(0)
    expect(previewArgs(state, META).levelIds).toEqual(['b'])
    expect(previewArgs(state, META).sheetNumbers).toEqual({ start: 1, total: 2 })
  })
})

describe('opciones del PDF', () => {
  it('buildArgs arma las opciones con lo elegido y los datos del proyecto', () => {
    const state = reduce(measured([GROUND, UPPER]), { type: 'mode', value: 'color' }, { type: 'titleBlock', value: false })
    expect(buildArgs(state, META)).toEqual({
      paper: 'A4',
      orientation: 'landscape',
      scale: 50,
      mode: 'color',
      levelIds: ['a', 'b'],
      titleBlock: false,
      projectName: 'Casa Alvear',
      author: 'Silvert Quispe',
      date: META.date,
    })
  })
})
