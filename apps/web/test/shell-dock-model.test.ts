import { describe, expect, it } from 'vitest'
import {
  type Arming,
  DOCK,
  MEASURE_ENTRIES,
  OPENING_ENTRIES,
  activeDockId,
  armingForButton,
  expectedState,
  structureEntries,
} from '../src/editor/shell/dock-model'

describe('DOCK', () => {
  it('son siete botones en castellano y en este orden', () => {
    expect(DOCK.map((b) => [b.id, b.label])).toEqual([
      ['select', 'Seleccionar'],
      ['structure', 'Estructura'],
      ['openings', 'Aberturas'],
      ['furniture', 'Muebles'],
      ['materials', 'Materiales'],
      ['measure', 'Medir'],
      ['more', 'Más'],
    ])
  })

  it('solo Estructura, Aberturas, Medir y Más abren un menú', () => {
    expect(DOCK.filter((b) => b.menu).map((b) => b.id)).toEqual(['structure', 'openings', 'measure', 'more'])
  })
})

describe('menús', () => {
  it('Estructura: Muro, Ambiente, Piso, Cielorraso, las tres escaleras y Columna (D6: "Ambiente", nunca "zona")', () => {
    expect(structureEntries().map((e) => [e.id, e.label])).toEqual([
      ['wall', 'Muro'],
      ['zone', 'Ambiente'],
      ['slab', 'Piso'],
      ['ceiling', 'Cielorraso'],
      ['stair', 'Escalera recta'],
      ['stair-curved', 'Escalera curva'],
      ['stair-spiral', 'Escalera caracol'],
      ['column', 'Columna'],
    ])
  })

  it('si el spike de la Tarea 0 dice que la herramienta de ambientes no funciona, Estructura no la ofrece', () => {
    const ids = structureEntries({ zoneTool: false }).map((e) => e.id)
    expect(ids).not.toContain('zone')
    expect(ids).toHaveLength(7)
  })

  it('Aberturas: Puerta y Ventana; Medir: distancia, ángulo, área, perímetro y volumen', () => {
    expect(OPENING_ENTRIES.map((e) => [e.id, e.label])).toEqual([['door', 'Puerta'], ['window', 'Ventana']])
    expect(MEASURE_ENTRIES.map((e) => [e.id, e.label])).toEqual([
      ['distance', 'Distancia'],
      ['angle', 'Ángulo'],
      ['area', 'Área'],
      ['perimeter', 'Perímetro'],
      ['volume', 'Volumen'],
    ])
  })
})

describe('expectedState (tabla 4.3 del spec)', () => {
  const cases: [string, Arming, { phase?: string; mode: string; tool: string | null }][] = [
    ['Seleccionar', { kind: 'select' }, { mode: 'select', tool: null }],
    ['Muro', { kind: 'tool', tool: 'wall' }, { phase: 'structure', mode: 'build', tool: 'wall' }],
    ['Ambiente', { kind: 'tool', tool: 'zone' }, { phase: 'structure', mode: 'build', tool: 'zone' }],
    ['Piso', { kind: 'tool', tool: 'slab' }, { phase: 'structure', mode: 'build', tool: 'slab' }],
    ['Cielorraso', { kind: 'tool', tool: 'ceiling' }, { phase: 'structure', mode: 'build', tool: 'ceiling' }],
    ['Escalera', { kind: 'tool', tool: 'stair' }, { phase: 'structure', mode: 'build', tool: 'stair' }],
    ['Columna', { kind: 'tool', tool: 'column' }, { phase: 'structure', mode: 'build', tool: 'column' }],
    ['Puerta', { kind: 'tool', tool: 'door' }, { phase: 'structure', mode: 'build', tool: 'door' }],
    ['Ventana', { kind: 'tool', tool: 'window' }, { phase: 'structure', mode: 'build', tool: 'window' }],
    ['Muebles', { kind: 'furniture' }, { phase: 'furnish', mode: 'build', tool: 'item' }],
    ['Materiales', { kind: 'paint' }, { phase: 'structure', mode: 'material-paint', tool: null }],
    ['Medir', { kind: 'measure', measure: 'area' }, { phase: 'structure', mode: 'build', tool: 'measurement' }],
    ['Eliminar', { kind: 'delete' }, { mode: 'delete', tool: null }],
  ]
  it.each(cases)('%s deja a Pascal en %j', (_label, arming, expected) => {
    expect(expectedState(arming)).toEqual(expected)
  })
})

describe('activeDockId (lo que el dock marca según el estado REAL de Pascal)', () => {
  it.each([
    [{ mode: 'select', tool: null }, 'select'],
    [{ mode: 'edit', tool: null }, 'select'],
    [{ mode: 'build', tool: 'wall' }, 'structure'], // un proyecto en blanco abre así
    [{ mode: 'build', tool: 'zone' }, 'structure'],
    [{ mode: 'build', tool: 'stair' }, 'structure'],
    [{ mode: 'build', tool: 'door' }, 'openings'],
    [{ mode: 'build', tool: 'window' }, 'openings'],
    [{ mode: 'build', tool: 'item' }, 'furniture'],
    [{ mode: 'build', tool: 'cabinet' }, 'furniture'],
    [{ mode: 'build', tool: 'measurement' }, 'measure'],
    [{ mode: 'material-paint', tool: null }, 'materials'],
    [{ mode: 'delete', tool: null }, 'more'],
    [{ mode: 'build', tool: 'roof' }, null],
    [{ mode: 'terrain-sculpt', tool: null }, null],
  ] as const)('%j marca %s', (state, expected) => {
    expect(activeDockId({ mode: state.mode, tool: state.tool })).toBe(expected)
  })

  it('cada botón sin menú tiene su armado y los demás no', () => {
    expect(armingForButton('select')).toEqual({ kind: 'select' })
    expect(armingForButton('furniture')).toEqual({ kind: 'furniture' })
    expect(armingForButton('materials')).toEqual({ kind: 'paint' })
    for (const id of ['structure', 'openings', 'measure', 'more'] as const) expect(armingForButton(id)).toBeNull()
  })
})
