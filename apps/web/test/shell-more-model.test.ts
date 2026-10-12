import { describe, expect, it } from 'vitest'
import { GRID_STEPS, ITEM_SNAP, SHORTCUTS, SOON_ITEMS, WALL_SNAP } from '../src/editor/shell/more-model'

const ENGLISH = /\b(select|delete|undo|redo|wall|zone|grid|snap|measure|furniture|save|cancel)\b/i

describe('menú Más', () => {
  it('la cuadrícula ofrece exactamente los pasos que admite Pascal (0,5; 0,25; 0,1 y 0,05 m)', () => {
    expect(GRID_STEPS.map((s) => s.value)).toEqual([0.5, 0.25, 0.1, 0.05])
    expect(GRID_STEPS.map((s) => s.label)).toEqual(['50 cm', '25 cm', '10 cm', '5 cm'])
  })

  it('los ajustes ofrecen solo los modos válidos de cada contexto de Pascal', () => {
    expect(WALL_SNAP.map((o) => o.value)).toEqual(['grid', 'lines', 'angles', 'off'])
    expect(ITEM_SNAP.map((o) => o.value)).toEqual(['lines', 'grid', 'off'])
  })

  it('los atajos están en castellano, sin teclas repetidas', () => {
    expect(new Set(SHORTCUTS.map((s) => s.keys)).size).toBe(SHORTCUTS.length)
    for (const s of SHORTCUTS) expect(s.label, s.keys).not.toMatch(ENGLISH)
    expect(SHORTCUTS.map((s) => s.keys)).toContain('Supr')
  })

  it('Compartir y Renderizar son los botones "Pronto"; Exportar plano ya es real (spec 4, criterio 2)', () => {
    expect(SOON_ITEMS.map((i) => i.label)).toEqual(['Compartir', 'Renderizar'])
  })
})
