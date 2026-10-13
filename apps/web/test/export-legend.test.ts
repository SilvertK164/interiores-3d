import { describe, expect, it } from 'vitest'
import { type LegendEntry, buildLegend, sortLegend } from '../src/lib/export/legend'

const zone = (label: string, areaM2 = 10): LegendEntry => ({ kind: 'zone', label, color: '#1F5FE0', areaM2 })
const material = (label: string): LegendEntry => ({ kind: 'material', label, color: '#C9A27A' })

describe('leyenda del cajetín', () => {
  it('ordena los ambientes por nombre (con tildes y ñ) y después los materiales, sin repetir materiales', () => {
    const sorted = sortLegend([material('Madera'), zone('Sala'), zone('Ñandú'), zone('Baño'), material('Madera'), material('Azulejo')])
    expect(sorted.map((e) => e.label)).toEqual(['Baño', 'Ñandú', 'Sala', 'Azulejo', 'Madera'])
  })

  it('no repite un ambiente que tenga el mismo nombre que otro (los dos se listan)', () => {
    expect(sortLegend([zone('Dormitorio'), zone('Dormitorio')])).toHaveLength(2)
  })

  it('si todo entra, no hay línea "y N más"', () => {
    const view = buildLegend([zone('A'), zone('B')], 8)
    expect(view.shown).toHaveLength(2)
    expect(view.more).toBe(0)
  })

  it('si no entra, la última fila es "y N más": se muestran capacidad - 1 y se cuenta el resto', () => {
    const entries = Array.from({ length: 10 }, (_, i) => zone(`Ambiente ${String(i).padStart(2, '0')}`))
    const view = buildLegend(entries, 8)
    expect(view.shown).toHaveLength(7)
    expect(view.more).toBe(3)
  })

  it('el borde exacto (tantos como filas) cabe sin "y N más"', () => {
    const entries = Array.from({ length: 4 }, (_, i) => zone(`Ambiente ${i}`))
    expect(buildLegend(entries, 4)).toEqual({ shown: entries, more: 0 })
  })

  it('con capacidad 1 solo queda la línea "y N más"; con capacidad 0 no hay dónde dibujar nada', () => {
    const entries = [zone('A'), zone('B'), zone('C')]
    expect(buildLegend(entries, 1)).toEqual({ shown: [], more: 3 })
    expect(buildLegend(entries, 0)).toEqual({ shown: [], more: 3 })
  })

  it('sin ambientes ni materiales la leyenda queda vacía y sin línea de resto (Review Focus 1)', () => {
    expect(buildLegend([], 8)).toEqual({ shown: [], more: 0 })
    expect(buildLegend([], 0)).toEqual({ shown: [], more: 0 })
  })
})
