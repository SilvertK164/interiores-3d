import { describe, expect, it } from 'vitest'
import { SHELF_STYLES } from '../src/editor/shell/properties-parametric'
import { CABINET_CARDS, SHELF_CARDS, STAIR_CARDS, cabinetDefaults, shelfPatch } from '../src/editor/shell/presets-model'

/** Los ids que Pascal 1.0.3 declara (verificados en node_modules; ver docs/pascal-notes.md). */
const PASCAL_SHELF_STYLES = ['wall-shelf', 'bookshelf', 'open-rack', 'cubby']
const PASCAL_CABINET_PRESETS = ['base-door', 'drawer-base', 'dishwasher', 'cooktop-gas', 'cooktop-induction', 'sink-base', 'tall-pantry', 'oven-tower', 'fridge-single']
const PASCAL_STAIR_TYPES = ['straight', 'curved', 'spiral']
const ENGLISH = /\b(Shelf|Cabinet|Base|Drawer|Sink|Fridge|Pantry|Tower|Spiral|Curved|Straight|Hob)\b/

describe('A medida: nada de Pascal queda sin tarjeta ni sin nombre en castellano', () => {
  it('cada estilo, preset y tipo de escalera de Pascal tiene tarjeta', () => {
    expect(SHELF_CARDS.map((c) => c.id).sort()).toEqual([...PASCAL_SHELF_STYLES].sort())
    expect(CABINET_CARDS.map((c) => c.id).sort()).toEqual([...PASCAL_CABINET_PRESETS].sort())
    expect(STAIR_CARDS.map((c) => c.id).sort()).toEqual([...PASCAL_STAIR_TYPES].sort())
  })

  it('los nombres son castellano, no están vacíos ni repetidos y coinciden con los de la ficha del estante', () => {
    const all = [...SHELF_CARDS, ...CABINET_CARDS, ...STAIR_CARDS]
    for (const card of all) {
      expect(card.label.length, card.id).toBeGreaterThan(2)
      expect(card.label, card.id).not.toMatch(ENGLISH)
    }
    const labels = all.map((c) => c.label)
    expect(new Set(labels).size).toBe(labels.length)
    for (const card of SHELF_CARDS) expect(SHELF_STYLES[card.id], card.id).toBe(card.label)
  })

  it('cada estilo de estante arma su parche (el cubículo es el valor de Pascal: no cambia nada)', () => {
    expect(shelfPatch('cubby')).toEqual({})
    for (const id of ['bookshelf', 'open-rack', 'wall-shelf'] as const) expect(shelfPatch(id)).toMatchObject({ style: id })
  })

  it('cada módulo trae medidas y compartimentos con id y tipo; los altos llevan alto de gabinete; sin zócalo ni encimera', () => {
    for (const card of CABINET_CARDS) {
      const d = cabinetDefaults(card.id) as { width: number; stack: { id: string; type: string }[]; cabinetType: string; carcassHeight?: number }
      expect(d.width, card.id).toBeGreaterThan(0.2)
      expect(d.stack.length, card.id).toBeGreaterThan(0)
      for (const c of d.stack) expect(Boolean(c.id && c.type), card.id).toBe(true)
      expect(d, card.id).not.toHaveProperty('showPlinth')
      expect(d, card.id).not.toHaveProperty('withCountertop')
      if (d.cabinetType === 'tall') expect(d.carcassHeight).toBeGreaterThan(1.7)
    }
  })
})
