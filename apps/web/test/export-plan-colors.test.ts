import { describe, expect, it } from 'vitest'
import { CATEGORY_COLORS, FALLBACK_FLOOR_COLOR, type MaterialLookup, floorInfoOf } from '../src/lib/export/plan-colors'

const lookup: MaterialLookup = (id) =>
  ({
    'preset-white': { label: 'Blanco', category: 'colors', previewColor: '#E9E9E9' },
    'wood-woodfine22': { label: 'Madera fina', category: 'wood' },
    'weird-thing': { label: 'Cosa rara', category: 'inexistente' },
  })[id]

describe('color del piso (criterio 10)', () => {
  it('un material con color de vista previa usa ese color y su nombre en castellano', () => {
    expect(floorInfoOf({ materialPreset: 'library:preset-white' }, lookup)).toEqual({ color: '#E9E9E9', label: 'Blanco' })
  })

  it('un material solo con textura usa el gris de su categoría (propuesta del spec)', () => {
    expect(floorInfoOf({ materialPreset: 'library:wood-woodfine22' }, lookup)).toEqual({ color: CATEGORY_COLORS.wood, label: 'Madera fina' })
  })

  it('una categoría desconocida cae al gris general', () => {
    expect(floorInfoOf({ materialPreset: 'library:weird-thing' }, lookup)).toEqual({ color: FALLBACK_FLOOR_COLOR, label: 'Cosa rara' })
  })

  it('un color propio de la losa gana, y sin material de la biblioteca no se lista en la leyenda', () => {
    expect(floorInfoOf({ material: { color: '#aabbcc' } }, lookup)).toEqual({ color: '#aabbcc', label: null })
    expect(floorInfoOf({ materialPreset: 'library:wood-woodfine22', material: { color: '#aabbcc' } }, lookup)).toEqual({ color: '#aabbcc', label: 'Madera fina' })
  })

  it('una losa sin material (o con una referencia que no es de la biblioteca o no existe) no tiene color', () => {
    expect(floorInfoOf({}, lookup)).toEqual({ color: null, label: null })
    expect(floorInfoOf({ materialPreset: 'scene:abc' }, lookup)).toEqual({ color: null, label: null })
    expect(floorInfoOf({ materialPreset: 'library:no-existe' }, lookup)).toEqual({ color: null, label: null })
  })

  it('un color propio mal escrito se ignora', () => {
    expect(floorInfoOf({ material: { color: 'rojo; drop' } }, lookup)).toEqual({ color: null, label: null })
  })
})
