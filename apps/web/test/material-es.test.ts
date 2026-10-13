import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MATERIAL_CATEGORY_ES, MATERIAL_ES, materialCategoryEs, materialNameEs } from '../src/lib/material-es'

// La frontera D8 prohíbe importar @pascal-app/* fuera de src/editor/: el catálogo de Pascal se lee como texto.
const library = readFileSync(fileURLToPath(new URL('../node_modules/@pascal-app/core/dist/material-library.js', import.meta.url)), 'utf8')
const catalogSource = library.slice(library.indexOf('export const MATERIAL_CATALOG'))
const MATERIAL_CATALOG = [...catalogSource.matchAll(/\n {8}id: '([^']+)',\n {8}label: '([^']+)'/g)].map((m) => ({ id: m[1] as string, label: m[2] as string }))
const categoriesSource = library.slice(library.indexOf('export const MATERIAL_CATEGORIES'), library.indexOf('export const MATERIAL_SURFACES'))
const MATERIAL_CATEGORIES = [...categoriesSource.matchAll(/'([a-z]+)',/g)].map((m) => m[1] as string)
const IDS = MATERIAL_CATALOG.map((item) => item.id)
const words = (text: string) => text.toLowerCase().split(/[^a-záéíóúüñ]+/).filter((word) => word.length > 2)
// Palabras que se escriben igual en castellano y en inglés.
const SAME_IN_SPANISH = new Set(['beige', 'metal', 'bouclé', 'panel'])

describe('materiales en castellano', () => {
  it('la lectura del catálogo de Pascal encuentra los 114 materiales y las 16 categorías', () => {
    expect(MATERIAL_CATALOG).toHaveLength(114)
    expect(MATERIAL_CATEGORIES).toHaveLength(16)
  })

  it('cada material de la biblioteca de Pascal tiene nombre (si Pascal suma uno, esta prueba lo dice)', () => {
    expect(IDS.filter((id) => !(id in MATERIAL_ES))).toEqual([])
  })

  it('la tabla no guarda ids que Pascal no tiene (un error de tipeo no se queda mudo)', () => {
    const known = new Set(IDS)
    expect(Object.keys(MATERIAL_ES).filter((id) => !known.has(id))).toEqual([])
  })

  it('no hay dos materiales con el mismo nombre', () => {
    const names = Object.values(MATERIAL_ES)
    expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([])
  })

  it('ningún nombre conserva palabras del inglés de la biblioteca', () => {
    const english = new Set(MATERIAL_CATALOG.flatMap((item) => words(item.label)))
    const kept = Object.entries(MATERIAL_ES).flatMap(([id, name]) =>
      words(name)
        .filter((word) => english.has(word) && !SAME_IN_SPANISH.has(word))
        .map((word) => `${id}: ${word}`),
    )
    expect(kept).toEqual([])
  })

  it('las 16 categorías tienen etiqueta y la conocida se lee en castellano', () => {
    expect(MATERIAL_CATEGORIES.filter((category) => !(category in MATERIAL_CATEGORY_ES))).toEqual([])
    expect(materialCategoryEs('tile')).toBe('Cerámica')
    expect(materialCategoryEs('inventada')).toBe('Otros')
    expect(materialNameEs('preset-white', 'White')).toBe('Blanco')
    expect(materialNameEs('no-existe', 'Mystery')).toBe('Mystery')
  })
})
