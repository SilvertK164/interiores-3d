import { describe, expect, it } from 'vitest'
import { COMMERCE_PASCAL_IDS } from '../src/editor/commerce-catalog'
import { CATALOG_CATEGORIES, CATALOG_ES, categoryOf, nameEs } from '../src/lib/catalog-es'
import { availableAssetIds, availableAssets } from './support/asset-ids'

/** Palabras que delatan un nombre sin traducir. */
const ENGLISH = /\b(table|chair|bed|lamp|shower|sink|stand|rack|toy|light|plant|tree|machine|speaker|kitchen|counter|shelf|panel|fan|iron|bag|rug|door|wall|floor)\b/i
/** Nombres que se escriben igual en los dos idiomas. */
const SAME_IN_BOTH = new Set(['Cactus', 'Piano'])

describe('catálogo en castellano', () => {
  const assets = availableAssets()

  it('hay un ítem local por cada id (los 101 del catálogo con modelo propio)', () => {
    expect(assets.length).toBeGreaterThanOrEqual(100)
    expect(availableAssetIds().size).toBe(assets.length)
  })

  it('todos los ítems del catálogo tienen nombre y categoría en castellano (falla si falta alguno)', () => {
    for (const asset of assets) {
      const entry = CATALOG_ES[asset.id]
      expect(entry, `falta ${asset.id} (${asset.name})`).toBeDefined()
      expect(entry?.[0].trim(), asset.id).not.toBe('')
      expect(CATALOG_CATEGORIES.map((c) => c.id), asset.id).toContain(entry?.[1])
    }
  })

  it('la tabla no tiene ids de más (un error de tipeo no pasa inadvertido)', () => {
    const real = availableAssetIds()
    for (const id of Object.keys(CATALOG_ES)) expect(real.has(id), id).toBe(true)
  })

  it('los nombres no son los de Pascal, no tienen palabras en inglés y no se repiten', () => {
    const names = Object.values(CATALOG_ES).map(([name]) => name)
    expect(new Set(names).size).toBe(names.length)
    for (const asset of assets) {
      const name = nameEs(asset.id, asset.name)
      if (!SAME_IN_BOTH.has(name)) expect(name, asset.id).not.toBe(asset.name)
      expect(name, asset.id).not.toMatch(ENGLISH)
    }
  })

  it('las 33 piezas de Comercio están en la tabla y cada categoría tiene al menos una pieza', () => {
    for (const id of COMMERCE_PASCAL_IDS) expect(CATALOG_ES[id], id).toBeDefined()
    for (const category of CATALOG_CATEGORIES) {
      expect(Object.values(CATALOG_ES).some(([, c]) => c === category.id), category.id).toBe(true)
    }
  })

  it('un id desconocido usa el nombre de respaldo y la categoría "otros"', () => {
    expect(nameEs('sofa', 'Sofa')).toBe('Sofá')
    expect(nameEs('no-existe', 'Respaldo')).toBe('Respaldo')
    expect(categoryOf('bathtub')).toBe('bano')
    expect(categoryOf('no-existe')).toBe('otros')
  })
})
