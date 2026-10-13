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
// Un plano de 4 × 3 m: los muebles van en metros desde la esquina noroeste.
const detected = (over: Partial<DetectedFurniture> = {}): DetectedFurniture => ({
  asset_id: 'sofa',
  x_m: 2,
  z_m: 1.5,
  facing_deg: 0,
  against_wall: null,
  on_top_of: null,
  confidence: 0.9,
  ...over,
})
const analysisOf = (furniture: DetectedFurniture[], warnings: string[] = []): RoomAnalysis => ({
  room: { width_m: 4, depth_m: 3 },
  camera: { x_m: 2, z_m: 2.8, look_at: { x_m: 2, z_m: 0 } },
  openings: [],
  furniture,
  warnings,
})
const LOCAL: Record<string, { id: string; name: string; dimensions: [number, number, number] }> = {
  sofa: { id: 'sofa', name: 'Sofa', dimensions: [2, 1, 1] },
  'dining-chair': { id: 'dining-chair', name: 'Dining chair', dimensions: [0.5, 0.9, 0.5] },
  'tv-stand': { id: 'tv-stand', name: 'TV stand', dimensions: [1.8, 0.35, 0.3] },
  television: { id: 'television', name: 'Television', dimensions: [1.6, 1, 0.4] },
}
const resolve = (id: string) => LOCAL[id]
describe('detectedRows (lo que el diálogo lista tras analizar)', () => {
  it('una fila por pieza, todas marcadas, con el nombre en castellano, la confianza y el lugar que le toca (en metros, relativo al centro del ambiente)', () => {
    const { rows, warnings } = detectedRows(analysisOf([detected({ x_m: 2.5, z_m: 1.5, confidence: 0.92 }), detected({ asset_id: 'dining-chair', x_m: 1, z_m: 2, confidence: 0.5 })]), resolve)
    expect(warnings).toEqual([])
    expect(rows.map((r) => [r.name, r.confidence, r.checked])).toEqual([
      ['Sofá', 0.92, true],
      ['Silla de comedor', 0.5, true],
    ])
    expect(rows[0]?.piece.at).toEqual([0.5, 0]) // el centro del ambiente es (2; 1,5)
    expect(rows[1]?.piece.at).toEqual([-1, 0.5])
    expect(rows[0]?.piece.asset).toBe(LOCAL.sofa)
  })

  it('las medidas del ambiente son las del plano: no hay ningún ancho que suponer', () => {
    const wider = { ...analysisOf([detected({ x_m: 3, z_m: 1.5 })]), room: { width_m: 6, depth_m: 3 } }
    expect(detectedRows(wider, resolve).rows[0]?.piece.at).toEqual([0, 0])
  })

  it('lo apoyado sobre otra pieza lleva su altura y recuerda cuál es su soporte', () => {
    const { rows } = detectedRows(analysisOf([detected({ asset_id: 'tv-stand', x_m: 2, z_m: 0.3, against_wall: 'n' }), detected({ asset_id: 'television', x_m: 2, z_m: 0.3, on_top_of: 0 })]), resolve)
    expect(rows.map((r) => r.piece.y)).toEqual([0, 0.35])
    expect(rows[0]?.supportKey).toBeNull()
    expect(rows[1]?.supportKey).toBe(rows[0]?.key)
  })

  it('las piezas repetidas son filas distintas, cada una con su clave', () => {
    const { rows } = detectedRows(analysisOf([detected({ asset_id: 'dining-chair', x_m: 0.8 }), detected({ asset_id: 'dining-chair', x_m: 3.2 })]), resolve)
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map((r) => r.key)).size).toBe(2)
  })

  it('lo que se descarta (confianza baja o un id que el catálogo no tiene) sale como aviso, después de los avisos del servicio', () => {
    const { rows, warnings } = detectedRows(
      analysisOf([detected({ asset_id: 'inventada' }), detected({ confidence: 0.1 }), detected({ asset_id: 'dining-chair' })], ['La silla está tapada.']),
      resolve,
    )
    expect(rows.map((r) => r.piece.asset.id)).toEqual(['dining-chair'])
    expect(warnings).toHaveLength(3)
    expect(warnings[0]).toBe('La silla está tapada.')
    expect(warnings[1]).toContain('inventada')
    expect(warnings[2]).toContain('Sofá')
  })

  it('sin muebles: ninguna fila, pero los avisos del servicio se conservan', () => {
    expect(detectedRows(analysisOf([], ['No se ve ningún mueble.']), resolve)).toEqual({ rows: [], warnings: ['No se ve ningún mueble.'] })
  })
})

describe('photoReducer', () => {
  const analyzed = (rows = detectedRows(analysisOf([detected({ x_m: 1 }), detected({ asset_id: 'dining-chair', x_m: 3 })]), resolve).rows): PhotoState => ({
    ...initialState(),
    file: photo(),
    step: 'results',
    rows,
    warnings: ['Un aviso'],
  })

  it('empieza en el formulario, sin foto y sin errores', () => {
    expect(initialState()).toEqual({ step: 'form', file: null, widthText: '', error: null, rows: [], warnings: [], example: false })
  })

  it('al abrir se parte de cero', () => {
    const dirty = { ...analyzed(), widthText: '4', error: 'x' }
    expect(photoReducer(dirty, { type: 'open' })).toEqual(initialState())
  })

  it('elegir la foto y escribir el ancho se guarda; elegir otra foto borra el error', () => {
    let state = photoReducer(initialState(), { type: 'failed', message: 'no se pudo' })
    state = photoReducer(state, { type: 'file', file: photo() })
    expect(state.file?.name).toBe('sala.png')
    expect(state.error).toBeNull()
    state = photoReducer(state, { type: 'width', value: '4,5' })
    expect(state).toMatchObject({ widthText: '4,5', error: null })
  })

  it('analizar pasa a «analizando» y borra el error anterior', () => {
    const state = photoReducer({ ...initialState(), error: 'viejo', file: photo() }, { type: 'analyzing' })
    expect(state).toMatchObject({ step: 'analyzing', error: null })
  })

  it('al terminar muestra las filas (todas marcadas) y los avisos', () => {
    const { rows } = detectedRows(analysisOf([detected()]), resolve)
    const state = photoReducer({ ...initialState(), step: 'analyzing', file: photo() }, { type: 'analyzed', rows, warnings: ['Aviso'] })
    expect(state).toMatchObject({ step: 'results', error: null, warnings: ['Aviso'] })
    expect(state.rows.every((r) => r.checked)).toBe(true)
  })

  it('el ejemplo se marca para mostrar su foto: un análisis de verdad no, y «cambiar la foto» la quita', () => {
    const { rows } = detectedRows(analysisOf([detected()]), resolve)
    expect(initialState().example).toBe(false)
    expect(photoReducer(initialState(), { type: 'analyzed', rows, warnings: [] }).example).toBe(false)
    const example = photoReducer(initialState(), { type: 'analyzed', rows, warnings: [], example: true })
    expect(example).toMatchObject({ step: 'results', example: true })
    expect(photoReducer(example, { type: 'back' }).example).toBe(false)
    expect(photoReducer(example, { type: 'open' }).example).toBe(false)
  })

  it('si falla vuelve al formulario con el mensaje, sin tocar lo que escribió la persona', () => {
    const before = { ...initialState(), step: 'analyzing' as const, file: photo(), widthText: '3' }
    const state = photoReducer(before, { type: 'failed', message: 'No hay conexión.' })
    expect(state).toMatchObject({ step: 'form', error: 'No hay conexión.', widthText: '3' })
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

  it('desmarcar un soporte desmarca lo que está apoyado sobre él, y marcar lo apoyado marca su soporte (no queda una tele flotando)', () => {
    const { rows } = detectedRows(analysisOf([detected({ asset_id: 'tv-stand', x_m: 2, z_m: 0.3, against_wall: 'n' }), detected({ asset_id: 'television', x_m: 2, z_m: 0.3, on_top_of: 0 }), detected({ x_m: 2, z_m: 2 })]), resolve)
    const [stand, tv, sofa] = rows
    const state: PhotoState = { ...initialState(), file: photo(), step: 'results', rows }
    const standOff = photoReducer(state, { type: 'toggle', key: stand?.key as string })
    expect(standOff.rows.map((r) => r.checked)).toEqual([false, false, true])
    const tvOn = photoReducer(standOff, { type: 'toggle', key: tv?.key as string })
    expect(tvOn.rows.map((r) => r.checked)).toEqual([true, true, true])
    const tvOff = photoReducer(state, { type: 'toggle', key: tv?.key as string })
    expect(tvOff.rows.map((r) => r.checked)).toEqual([true, false, true])
    expect(photoReducer(state, { type: 'toggle', key: sofa?.key as string }).rows.map((r) => r.checked)).toEqual([true, true, false])
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
  const base = initialState()
  const file = photo()

  it('analizar pide una foto y no se puede mientras ya se analiza', () => {
    expect(canAnalyze(base)).toBe(false)
    expect(canAnalyze({ ...base, file })).toBe(true)
    expect(canAnalyze({ ...base, file, step: 'analyzing' })).toBe(false)
  })

  it('agregar pide estar en la lista y tener al menos una pieza marcada', () => {
    const { rows } = detectedRows(analysisOf([detected({ x_m: 1 }), detected({ x_m: 3 })]), resolve)
    expect(canAdd({ ...base, step: 'results', rows })).toBe(true)
    expect(canAdd({ ...base, step: 'results', rows: rows.map((r) => ({ ...r, checked: false })) })).toBe(false)
    expect(canAdd({ ...base, step: 'results', rows: [] })).toBe(false)
    expect(canAdd({ ...base, step: 'form', rows })).toBe(false)
  })

  it('el resumen cuenta las piezas elegidas, en singular o plural', () => {
    const { rows } = detectedRows(analysisOf([detected({ x_m: 1 }), detected({ asset_id: 'dining-chair', x_m: 2 }), detected({ x_m: 3, z_m: 0.8 })]), resolve)
    const state = { ...base, step: 'results' as const, rows: rows.map((r, i) => ({ ...r, checked: i < 2 })) }
    expect(selectionSummary(state)).toBe('2 de 3 muebles elegidos')
    expect(selectionSummary({ ...state, rows: rows.slice(0, 1) })).toBe('1 de 1 mueble elegido')
  })
})
