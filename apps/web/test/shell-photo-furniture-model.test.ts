import { describe, expect, it } from 'vitest'
import {
  type PhotoState,
  TEXT,
  canAdd,
  canAnalyze,
  checkedRows,
  detectedRows,
  initialState,
  photoReducer,
  selectionSummary,
} from '../src/editor/shell/photo-furniture-model'
import type { DetectedFurniture, RoomAnalysis } from '../src/lib/lab/schema'

const photo = () => new File([new Uint8Array([137, 80, 78, 71])], 'sala.png', { type: 'image/png' })
const detected = (over: Partial<DetectedFurniture> = {}): DetectedFurniture => ({
  asset_id: 'sofa',
  x: 0.5,
  y: 0.5,
  width: 0.3,
  depth: 0.2,
  rotation_deg: 0,
  confidence: 0.9,
  ...over,
})
const analysisOf = (furniture: DetectedFurniture[], warnings: string[] = []): RoomAnalysis => ({
  furniture,
  warnings,
  calibration: { status: 'uncalibrated', width_m: null },
})
const LOCAL: Record<string, { id: string; name: string }> = {
  sofa: { id: 'sofa', name: 'Sofa' },
  'dining-chair': { id: 'dining-chair', name: 'Dining chair' },
}
const resolve = (id: string) => LOCAL[id]
const URL = 'http://localhost:8000'

describe('detectedRows (lo que el diálogo lista tras analizar)', () => {
  it('una fila por pieza, todas marcadas, con el nombre en castellano, la confianza y el lugar que le toca', () => {
    const { rows, warnings } = detectedRows(analysisOf([detected({ x: 1, y: 1, confidence: 0.92 }), detected({ asset_id: 'dining-chair', confidence: 0.5 })]), resolve, null)
    expect(warnings).toEqual([])
    expect(rows.map((r) => [r.name, r.confidence, r.checked])).toEqual([
      ['Sofá', 0.92, true],
      ['Silla de comedor', 0.5, true],
    ])
    expect(rows[0]?.piece.at).toEqual([2, 1.5])
    expect(rows[0]?.piece.asset).toBe(LOCAL.sofa)
  })

  it('usa el ancho conocido para ubicar las piezas', () => {
    const { rows } = detectedRows(analysisOf([detected({ x: 1, y: 0.5 })]), resolve, 6)
    expect(rows[0]?.piece.at).toEqual([3, 0])
  })

  it('las piezas repetidas son filas distintas, cada una con su clave', () => {
    const { rows } = detectedRows(analysisOf([detected({ asset_id: 'dining-chair', x: 0.2 }), detected({ asset_id: 'dining-chair', x: 0.8 })]), resolve, null)
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map((r) => r.key)).size).toBe(2)
  })

  it('lo que se descarta (confianza baja o un id que el catálogo no tiene) sale como aviso, después de los avisos de TP3', () => {
    const { rows, warnings } = detectedRows(
      analysisOf([detected({ asset_id: 'inventada' }), detected({ confidence: 0.1 }), detected({ asset_id: 'dining-chair' })], ['La silla está tapada.']),
      resolve,
      null,
    )
    expect(rows.map((r) => r.piece.asset.id)).toEqual(['dining-chair'])
    expect(warnings).toHaveLength(3)
    expect(warnings[0]).toBe('La silla está tapada.')
    expect(warnings[1]).toContain('inventada')
    expect(warnings[2]).toContain('Sofá')
  })

  it('sin muebles: ninguna fila, pero los avisos de TP3 se conservan', () => {
    expect(detectedRows(analysisOf([], ['No se ve ningún mueble.']), resolve, null)).toEqual({ rows: [], warnings: ['No se ve ningún mueble.'] })
  })
})

describe('photoReducer', () => {
  const analyzed = (rows = detectedRows(analysisOf([detected(), detected({ asset_id: 'dining-chair' })]), resolve, null).rows): PhotoState => ({
    ...initialState(URL),
    file: photo(),
    step: 'results',
    rows,
    warnings: ['Un aviso'],
  })

  it('empieza en el formulario, sin foto, con la dirección que se le da y sin errores', () => {
    expect(initialState(URL)).toEqual({ step: 'form', file: null, widthText: '', serviceUrl: URL, error: null, rows: [], warnings: [] })
  })

  it('al abrir se parte de cero, con la dirección guardada', () => {
    const dirty = { ...analyzed(), widthText: '4', error: 'x' }
    expect(photoReducer(dirty, { type: 'open', serviceUrl: 'http://127.0.0.1:8000' })).toEqual(initialState('http://127.0.0.1:8000'))
  })

  it('elegir la foto, escribir el ancho y la dirección se guarda; elegir otra foto borra el error', () => {
    let state = photoReducer(initialState(URL), { type: 'failed', message: 'no se pudo' })
    state = photoReducer(state, { type: 'file', file: photo() })
    expect(state.file?.name).toBe('sala.png')
    expect(state.error).toBeNull()
    state = photoReducer(state, { type: 'width', value: '4,5' })
    state = photoReducer(state, { type: 'url', value: 'http://otro:8000' })
    expect(state).toMatchObject({ widthText: '4,5', serviceUrl: 'http://otro:8000' })
  })

  it('analizar pasa a «analizando» y borra el error anterior', () => {
    const state = photoReducer({ ...initialState(URL), error: 'viejo', file: photo() }, { type: 'analyzing' })
    expect(state).toMatchObject({ step: 'analyzing', error: null })
  })

  it('al terminar muestra las filas (todas marcadas) y los avisos', () => {
    const { rows } = detectedRows(analysisOf([detected()]), resolve, null)
    const state = photoReducer({ ...initialState(URL), step: 'analyzing', file: photo() }, { type: 'analyzed', rows, warnings: ['Aviso'] })
    expect(state).toMatchObject({ step: 'results', error: null, warnings: ['Aviso'] })
    expect(state.rows.every((r) => r.checked)).toBe(true)
  })

  it('si falla vuelve al formulario con el mensaje, sin tocar lo que escribió la persona', () => {
    const before = { ...initialState(URL), step: 'analyzing' as const, file: photo(), widthText: '3' }
    const state = photoReducer(before, { type: 'failed', message: 'TP3 no está corriendo.' })
    expect(state).toMatchObject({ step: 'form', error: 'TP3 no está corriendo.', widthText: '3' })
    expect(state.file).toBe(before.file)
  })

  it('desmarcar y volver a marcar una fila cambia solo esa', () => {
    const state = analyzed()
    const [first, second] = state.rows
    const off = photoReducer(state, { type: 'toggle', key: first?.key as string })
    expect(off.rows.map((r) => r.checked)).toEqual([false, true])
    expect(checkedRows(off)).toEqual([second])
    const on = photoReducer(off, { type: 'toggle', key: first?.key as string })
    expect(on.rows.every((r) => r.checked)).toBe(true)
  })

  it('«cambiar la foto» vuelve al formulario y se queda con lo escrito, sin las filas', () => {
    const state = photoReducer({ ...analyzed(), widthText: '4' }, { type: 'back' })
    expect(state).toMatchObject({ step: 'form', widthText: '4', rows: [], warnings: [] })
    expect(state.file?.name).toBe('sala.png')
  })

  it('un error al agregar queda a la vista sin salir de la lista', () => {
    const state = photoReducer(analyzed(), { type: 'failed', message: TEXT.addFailed, stay: true })
    expect(state).toMatchObject({ step: 'results', error: TEXT.addFailed })
    expect(state.rows).toHaveLength(2)
  })
})

describe('qué se puede hacer', () => {
  const base = initialState(URL)
  const file = photo()

  it('analizar pide una foto y no se puede mientras ya se analiza', () => {
    expect(canAnalyze(base)).toBe(false)
    expect(canAnalyze({ ...base, file })).toBe(true)
    expect(canAnalyze({ ...base, file, step: 'analyzing' })).toBe(false)
  })

  it('agregar pide estar en la lista y tener al menos una pieza marcada', () => {
    const { rows } = detectedRows(analysisOf([detected(), detected()]), resolve, null)
    expect(canAdd({ ...base, step: 'results', rows })).toBe(true)
    expect(canAdd({ ...base, step: 'results', rows: rows.map((r) => ({ ...r, checked: false })) })).toBe(false)
    expect(canAdd({ ...base, step: 'results', rows: [] })).toBe(false)
    expect(canAdd({ ...base, step: 'form', rows })).toBe(false)
  })

  it('el resumen cuenta las piezas elegidas, en singular o plural', () => {
    const { rows } = detectedRows(analysisOf([detected(), detected(), detected()]), resolve, null)
    const state = { ...base, step: 'results' as const, rows: rows.map((r, i) => ({ ...r, checked: i < 2 })) }
    expect(selectionSummary(state)).toBe('2 de 3 muebles elegidos')
    expect(selectionSummary({ ...state, rows: rows.slice(0, 1) })).toBe('1 de 1 mueble elegido')
  })
})
