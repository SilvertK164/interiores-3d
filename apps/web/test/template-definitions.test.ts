import { describe, expect, it } from 'vitest'
import { MATERIAL_IDS } from '../src/editor/templates/scene-builder'
import { TEMPLATES, TEMPLATE_DEFINITIONS, templateById, templatesForKind } from '../src/lib/templates'
import type { TemplateDefinition } from '../src/lib/templates/types'
import { validateDefinition } from '../src/lib/templates/validate'
import { availableAssetIds } from './support/asset-ids'

const assets = availableAssetIds()
const pieces = (d: TemplateDefinition) => d.levels.reduce((n, l) => n + l.items.length + (l.shelves ?? []).length + (l.cabinets ?? []).length, 0)
const materialsOf = (d: TemplateDefinition) =>
  new Set(
    d.levels.flatMap((l) => [
      l.wallInside,
      l.wallOutside,
      ...l.walls.flatMap((w) => [w.inside, w.outside]),
      ...l.rooms.flatMap((r) => [r.floor, r.ceiling]),
      ...(l.shelves ?? []).map((sh) => sh.material),
      ...(l.cabinets ?? []).map((c) => c.material),
    ]).filter(Boolean),
  )

describe('definiciones de plantilla', () => {
  it('hay cuatro: concept store, café, supermercado y loft', () => {
    expect(TEMPLATE_DEFINITIONS.map((d) => d.id)).toEqual(['concept-store', 'cafe', 'supermercado', 'loft'])
  })

  it.each(TEMPLATE_DEFINITIONS.map((d) => [d.id, d] as const))('%s es válida (muros cerrados, aberturas, piezas y materiales)', (_id, def) => {
    expect(validateDefinition(def, assets, MATERIAL_IDS)).toEqual([])
  })

  it.each(TEMPLATE_DEFINITIONS.map((d) => [d.id, d] as const))('%s muestra potencial: 3+ ambientes, 20+ piezas (muebles, estantes y gabinetes) y 5+ materiales distintos', (_id, def) => {
    expect(def.levels.flatMap((l) => l.rooms).length).toBeGreaterThanOrEqual(3)
    expect(pieces(def)).toBeGreaterThanOrEqual(20)
    expect(materialsOf(def).size).toBeGreaterThanOrEqual(5)
  })

  it('las plantillas de comercio usan estantes y gabinetes paramétricos, y todas llevan al menos un gabinete o estante', () => {
    for (const def of TEMPLATE_DEFINITIONS.filter((d) => d.kind === 'comercio')) {
      expect(def.levels.flatMap((l) => l.shelves ?? []).length, `${def.id}: estantes`).toBeGreaterThanOrEqual(3)
      expect(def.levels.flatMap((l) => l.cabinets ?? []).length, `${def.id}: gabinetes`).toBeGreaterThanOrEqual(2)
    }
  })

  it('al menos dos plantillas tienen 2 niveles con escalera', () => {
    const multi = TEMPLATE_DEFINITIONS.filter((d) => d.levels.length >= 2 && d.levels.some((l) => (l.stairs ?? []).length > 0))
    expect(multi.map((d) => d.id)).toEqual(['concept-store', 'loft'])
  })

  it('los metadatos salen de la definición y se filtran por tipo', () => {
    expect(templatesForKind('comercio').map((t) => t.id)).toEqual(['concept-store', 'cafe', 'supermercado'])
    expect(templatesForKind('vivienda').map((t) => t.id)).toEqual(['loft'])
    expect(templateById('cafe')?.file).toBe('/templates/cafe.json')
    expect(templateById('cafe')?.thumbnail).toBe('/templates/cafe.svg')
    expect(templateById('no-existe')).toBeUndefined()
    expect(TEMPLATES.every((t) => t.areaM2 >= 80)).toBe(true)
  })
})
