import { describe, expect, it } from 'vitest'
import { type ExportState, exportReducer, fitInfo, initialState } from '../src/editor/shell/export-plan-model'
import type { PlanLevel } from '../src/lib/export/types'

const GROUND: PlanLevel = { id: 'a', label: 'Planta baja', widthM: 7.8, heightM: 3.8, empty: false }
const UPPER: PlanLevel = { id: 'b', label: 'Planta 1', widthM: 6, heightM: 3, empty: false }
const ATTIC: PlanLevel = { id: 'c', label: 'Altillo', widthM: 0, heightM: 0, empty: true }

const measured = (levels: PlanLevel[]): ExportState => exportReducer(exportReducer(initialState, { type: 'open' }), { type: 'measured', levels })

describe('generar (criterio 14)', () => {
  it('"generate" pasa a generando y un segundo "generate" no hace nada (un solo vuelo)', () => {
    const ready = measured([GROUND, UPPER])
    const generating = exportReducer(ready, { type: 'generate' })
    expect(generating.status).toBe('generating')
    expect(generating.progress).toEqual({ done: 0, total: 2 })
    expect(exportReducer(generating, { type: 'generate' })).toBe(generating)
    expect(fitInfo(generating).canDownload).toBe(false)
  })

  it('no se genera si no se puede descargar', () => {
    const nothing = measured([ATTIC])
    expect(exportReducer(nothing, { type: 'generate' })).toBe(nothing)
  })

  it('el progreso se refleja y al terminar vuelve a "listo"; los muebles que faltaron se avisan', () => {
    const generating = exportReducer(measured([GROUND, UPPER]), { type: 'generate' })
    const half = exportReducer(generating, { type: 'progress', value: { done: 1, total: 2 } })
    expect(half.progress).toEqual({ done: 1, total: 2 })
    const done = exportReducer(half, { type: 'done', skippedImages: 3 })
    expect(done.status).toBe('ready')
    expect(done.progress).toBeNull()
    expect(done.messageKind).toBe('notice')
    expect(done.message).toBe('No se pudieron dibujar 3 muebles; el resto del plano sí está en el PDF.')
    expect(exportReducer(half, { type: 'done', skippedImages: 0 }).message).toBeNull()
  })

  it('un error y una cancelación dejan el diálogo listo con su mensaje en castellano', () => {
    const generating = exportReducer(measured([GROUND]), { type: 'generate' })
    const failed = exportReducer(generating, { type: 'failed' })
    expect(failed).toMatchObject({ status: 'ready', messageKind: 'error', message: 'No pudimos generar el PDF. Inténtalo de nuevo.' })
    const cancelled = exportReducer(generating, { type: 'cancelled' })
    expect(cancelled).toMatchObject({ status: 'ready', messageKind: 'notice', message: 'Cancelaste la exportación.' })
    expect(exportReducer(cancelled, { type: 'dismissMessage' }).message).toBeNull()
  })
})
