import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SURFACE,
  type MaterialItemLike,
  SURFACE_TABS,
  categoriesFor,
  materialsFor,
  resolveCategory,
  swatchesFor,
} from '../src/editor/shell/materials-model'

const ITEMS: MaterialItemLike[] = [
  { id: 'preset-white', label: 'White', category: 'colors', color: '#e9e9e9' },
  { id: 'preset-cream', label: 'Cream', category: 'colors', color: '#f3ead2' },
  { id: 'preset-beige', label: 'Beige', category: 'colors', color: '#d9c7a3' },
  { id: 'wood-woodfine11', label: 'Wood Fine 11', category: 'wood', surfaces: ['floor', 'wall', 'furniture'], thumbnail: '/material/wood/11.webp' },
  { id: 'wood-woodfine2', label: 'Wood Fine 2', category: 'wood', surfaces: ['floor', 'wall', 'furniture'], thumbnail: '/material/wood/2.webp' },
  { id: 'flooring-tile20', label: 'Mosaic Tile', category: 'tile', surfaces: ['floor'] },
  { id: 'fabric-linen', label: 'Linen', category: 'fabric', surfaces: ['furniture', 'wall'] },
  { id: 'roof-claytiles', label: 'Clay Tiles', category: 'roofing', surfaces: ['roof'] },
]

describe('materialsFor', () => {
  it('trae los de esa superficie y los lisos que sirven para cualquiera', () => {
    expect(materialsFor(ITEMS, 'floor').map((m) => m.id)).toEqual([
      'preset-white', 'preset-cream', 'preset-beige', 'wood-woodfine11', 'wood-woodfine2', 'flooring-tile20',
    ])
    expect(materialsFor(ITEMS, 'roof').map((m) => m.id)).toEqual(['preset-white', 'preset-cream', 'preset-beige', 'roof-claytiles'])
  })
})

describe('categoriesFor y resolveCategory', () => {
  it('lista solo las categorías con materiales, en un orden fijo y en castellano', () => {
    expect(categoriesFor(ITEMS, 'floor')).toEqual([
      { id: 'wood', label: 'Madera' },
      { id: 'tile', label: 'Cerámica' },
      { id: 'colors', label: 'Colores' },
    ])
    expect(categoriesFor(ITEMS, 'wall').map((c) => c.id)).toEqual(['wood', 'fabric', 'colors'])
  })

  it('parte de la categoría propia de la superficie y, si no hay, de la primera disponible', () => {
    expect(resolveCategory(ITEMS, 'floor', null)).toBe('wood')
    expect(resolveCategory(ITEMS, 'wall', null)).toBe('colors')
    expect(resolveCategory(ITEMS, 'roof', null)).toBe('roofing')
    expect(resolveCategory(ITEMS.filter((m) => m.category !== 'wood'), 'floor', null)).toBe('tile')
    expect(resolveCategory([], 'floor', null)).toBeNull()
  })

  it('conserva la categoría pedida si existe en la superficie y la cambia si no', () => {
    expect(resolveCategory(ITEMS, 'floor', 'tile')).toBe('tile')
    expect(resolveCategory(ITEMS, 'roof', 'tile')).toBe('roofing')
  })
})

describe('swatchesFor', () => {
  it('muestra el nombre en castellano, la imagen o el color y marca el elegido', () => {
    const swatches = swatchesFor(ITEMS, 'floor', 'colors', 'preset-cream')
    expect(swatches.map((s) => [s.id, s.name, s.selected])).toEqual([
      ['preset-white', 'Blanco', false],
      ['preset-cream', 'Crema', true],
      ['preset-beige', 'Beige', false],
    ])
    expect(swatches[0]?.color).toBe('#e9e9e9')
  })

  it('ordena por nombre con los números en orden (2 antes que 11), salvo los colores, que siguen el orden de Pascal', () => {
    expect(swatchesFor(ITEMS, 'floor', 'wood', null).map((s) => s.name)).toEqual(['Madera fina 2', 'Madera fina 11'])
    expect(swatchesFor(ITEMS, 'floor', 'wood', null)[0]?.thumbnail).toBe('/material/wood/2.webp')
  })

  it('sin categoría no hay muestras', () => {
    expect(swatchesFor(ITEMS, 'floor', null, null)).toEqual([])
  })
})

describe('SURFACE_TABS', () => {
  it('son cuatro, con su rótulo y arrancan en Suelo', () => {
    expect(SURFACE_TABS.map((t) => t.label)).toEqual(['Suelo', 'Muros', 'Muebles', 'Techo'])
    expect(DEFAULT_SURFACE).toBe('floor')
  })
})
