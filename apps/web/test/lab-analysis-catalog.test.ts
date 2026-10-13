import { ANALYZE_CATALOG_MAX_BYTES, ANALYZE_CATALOG_MAX_ITEMS, AnalysisCatalogSchema } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { CATALOG_ES, nameEs } from '../src/lib/catalog-es'
import {
  MAX_CATALOG_BYTES,
  MAX_CATALOG_ITEMS,
  RECOGNIZABLE_IDS,
  type AnalysisCandidate,
  buildAnalysisCatalog,
  fitToLimits,
  pieceLabel,
  serializeCandidates,
} from '../src/lib/lab/analysis-catalog'
import { availableAssets } from './support/asset-ids'

// Las reglas con las que la API valida cada opción del catálogo (`CatalogOptionSchema` del contrato, portado de TP3).
const API_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/
const bytes = (text: string) => new TextEncoder().encode(text).length
const local = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: `${id} (en inglés)`, ...extra })

/** Las piezas del catálogo de Pascal con modelo local, tal como las recibe el editor. */
const REAL = availableAssets().map((a) => ({ id: a.id, name: a.name, dimensions: a.dimensions }))

describe('buildAnalysisCatalog: los candidatos', () => {
  it('cada candidato lleva solo id, nombre en castellano, categoría y etiquetas (sin rutas ni medidas)', () => {
    const { candidates } = buildAnalysisCatalog([local('sofa', { src: '/items/sofa/model.glb', thumbnail: '/items/sofa/thumbnail.webp', dimensions: [2, 1, 1] })])
    expect(candidates).toHaveLength(1)
    const sofa = candidates[0] as AnalysisCandidate
    expect(Object.keys(sofa).sort()).toEqual(['category', 'id', 'name', 'tags'])
    expect(sofa.id).toBe('sofa')
    expect(sofa.name).toBe(nameEs('sofa', 'x'))
    expect(sofa.name).toBe('Sofá')
    expect(sofa.category).not.toBe('')
    expect(sofa.tags.length).toBeGreaterThan(0)
    expect(JSON.stringify(candidates)).not.toMatch(/src|thumbnail|\/items\/|https?:|\.glb|dimensions/)
  })

  it('solo ofrece mobiliario y decoración reconocibles: deja fuera instalaciones, piezas de pared o techo y las que tienen herramienta propia', () => {
    const { candidates } = buildAnalysisCatalog([
      local('sofa'),
      local('hydrant'),
      local('sprinkler', { attachTo: 'ceiling' }),
      local('thermostat', { attachTo: 'wall-side' }),
      local('cabinet', { tool: 'cabinet' }),
      local('table-lamp'),
      local('pieza-nueva-de-pascal'),
      local('bathtub'),
    ])
    expect(candidates.map((c) => c.id).sort()).toEqual(['bathtub', 'sofa'])
  })

  it('aunque el id sea reconocible, una pieza que se cuelga de pared o techo no se ofrece (no hay dónde colgarla)', () => {
    expect(buildAnalysisCatalog([local('sofa', { attachTo: 'wall' }), local('bathtub', { attachTo: 'ceiling' })]).candidates).toEqual([])
  })

  it('las piezas que no están en el catálogo local simplemente no son candidatas', () => {
    expect(buildAnalysisCatalog([local('bathtub')]).candidates.map((c) => c.id)).toEqual(['bathtub'])
    expect(buildAnalysisCatalog([]).candidates).toEqual([])
  })

  it('el orden es siempre el mismo, venga como venga el catálogo', () => {
    const a = buildAnalysisCatalog([local('toilet'), local('sofa'), local('dining-table')]).candidates.map((c) => c.id)
    const b = buildAnalysisCatalog([local('sofa'), local('dining-table'), local('toilet')]).candidates.map((c) => c.id)
    expect(a).toEqual(b)
  })

  it('con un id repetido se queda con la primera pieza', () => {
    const first = local('sofa', { marca: 'primera' })
    const { candidates, pieces } = buildAnalysisCatalog([first, local('sofa', { marca: 'segunda' })])
    expect(candidates).toHaveLength(1)
    expect(pieces.get('sofa')).toBe(first)
  })
})

describe('buildAnalysisCatalog: el mapa id → pieza local', () => {
  it('devuelve la misma pieza local (con todo lo que trae) por cada candidato, y nada más', () => {
    const sofa = local('sofa', { src: '/items/sofa/model.glb', dimensions: [2.06, 0.74, 1.01] })
    const { candidates, pieces } = buildAnalysisCatalog([sofa, local('hydrant')])
    expect([...pieces.keys()]).toEqual(candidates.map((c) => c.id))
    expect(pieces.get('sofa')).toBe(sofa)
    expect(pieces.get('hydrant')).toBeUndefined()
    expect(pieces.get('id-inventado')).toBeUndefined()
  })
})

describe('buildAnalysisCatalog: con el catálogo real de Pascal', () => {
  const { candidates, pieces } = buildAnalysisCatalog(REAL)

  it('todas las piezas reconocibles existen en el catálogo local (ninguna tiene un id mal escrito)', () => {
    expect(candidates.map((c) => c.id).sort()).toEqual([...RECOGNIZABLE_IDS].sort())
    expect(candidates.length).toBeGreaterThanOrEqual(30)
  })

  it('cumple el contrato de la API (POST /v1/analyze-room), y cabe en sus límites', () => {
    expect(MAX_CATALOG_ITEMS).toBe(ANALYZE_CATALOG_MAX_ITEMS)
    expect(MAX_CATALOG_BYTES).toBe(ANALYZE_CATALOG_MAX_BYTES)
    const parsed = AnalysisCatalogSchema.safeParse(candidates)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(candidates.length).toBeLessThanOrEqual(MAX_CATALOG_ITEMS)
    expect(bytes(serializeCandidates(candidates))).toBeLessThanOrEqual(MAX_CATALOG_BYTES)
    expect(new Set(candidates.map((c) => c.id)).size).toBe(candidates.length)
    for (const c of candidates) {
      expect(c.id, c.id).toMatch(API_ID)
      expect(c.name.trim().length, c.id).toBeGreaterThan(0)
      expect(c.name.length, c.id).toBeLessThanOrEqual(120)
      expect(c.category.length, c.id).toBeGreaterThan(0)
      expect(c.category.length, c.id).toBeLessThanOrEqual(60)
      expect(c.tags.length, c.id).toBeLessThanOrEqual(10)
      for (const tag of c.tags) expect(tag.length, `${c.id}/${tag}`).toBeGreaterThanOrEqual(1)
      for (const tag of c.tags) expect(tag.length, `${c.id}/${tag}`).toBeLessThanOrEqual(40)
    }
  })

  it('los nombres salen de las tablas en castellano (no el nombre en inglés de Pascal)', () => {
    for (const c of candidates) expect(c.name, c.id).toBe(CATALOG_ES[c.id]?.[0])
    expect(candidates.find((c) => c.id === 'dining-table')?.name).toBe('Mesa de comedor')
  })

  it('el mapa tiene una pieza local por cada candidato', () => {
    expect(pieces.size).toBe(candidates.length)
  })
})

describe('fitToLimits', () => {
  const fake = (n: number, name = 'Pieza', tags = ['a']): AnalysisCandidate => ({ id: `pieza-${n}`, name, category: 'seating', tags })

  it('no pasa de 100 candidatos', () => {
    const many = Array.from({ length: 150 }, (_, n) => fake(n))
    const fitted = fitToLimits(many)
    expect(fitted).toHaveLength(MAX_CATALOG_ITEMS)
    expect(fitted[0]?.id).toBe('pieza-0')
  })

  it('no pasa de 64 KB (contados en UTF-8, con las tildes)', () => {
    const heavy = Array.from({ length: 100 }, (_, n) => fake(n, 'Á'.repeat(120), Array.from({ length: 10 }, () => 'Á'.repeat(40))))
    const fitted = fitToLimits(heavy)
    expect(fitted.length).toBeGreaterThan(0)
    expect(fitted.length).toBeLessThan(100)
    expect(bytes(serializeCandidates(fitted))).toBeLessThanOrEqual(MAX_CATALOG_BYTES)
    // una más ya no habría cabido
    expect(bytes(serializeCandidates(heavy.slice(0, fitted.length + 1)))).toBeGreaterThan(MAX_CATALOG_BYTES)
  })

  it('una lista que ya cabe queda igual', () => {
    const few = [fake(1), fake(2)]
    expect(fitToLimits(few)).toEqual(few)
  })
})

describe('serializeCandidates', () => {
  it('es el JSON compacto de la lista, con las tildes tal cual', () => {
    const list: AnalysisCandidate[] = [{ id: 'sofa', name: 'Sofá', category: 'seating', tags: ['couch'] }]
    expect(serializeCandidates(list)).toBe('[{"id":"sofa","name":"Sofá","category":"seating","tags":["couch"]}]')
    expect(JSON.parse(serializeCandidates(list))).toEqual(list)
  })
})

describe('pieceLabel', () => {
  const candidates: AnalysisCandidate[] = [{ id: 'sofa', name: 'Sofá', category: 'seating', tags: [] }]

  it('muestra el nombre en castellano de una pieza del catálogo', () => {
    expect(pieceLabel('sofa', candidates)).toBe('Sofá')
  })

  it('si no está en el catálogo lo dice, con el id tal cual', () => {
    expect(pieceLabel('lampara-rara', candidates)).toBe('lampara-rara (no está en el catálogo)')
  })
})
