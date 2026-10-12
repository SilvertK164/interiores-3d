import { describe, expect, it } from 'vitest'
import { deleteBlockedReason, deleteSummary, heightHint, stairNotice } from '../src/editor/shell/level-manage-model'

describe('textos de la gestión de plantas', () => {
  it('dice qué se pierde con el plural correcto', () => {
    expect(deleteSummary(2, 35)).toBe('Se borrarán 2 ambientes y 35 elementos.')
    expect(deleteSummary(1, 1)).toBe('Se borrarán 1 ambiente y 1 elemento.')
    expect(deleteSummary(0, 4)).toBe('Se borrarán 4 elementos.')
    expect(deleteSummary(3, 0)).toBe('Se borrarán 3 ambientes.')
    expect(deleteSummary(0, 0)).toBe('La planta está vacía: no se pierde nada.')
  })

  it('explica por qué no se borra la única planta', () => {
    expect(deleteBlockedReason(true)).toBeNull()
    expect(deleteBlockedReason(false)).toBe('No se puede eliminar la única planta del proyecto.')
  })

  it('el rango de la altura sale en metros con coma', () => {
    expect(heightHint()).toBe('Entre 2,00 m y 6,00 m')
  })

  it('avisa de las escaleras que ya no conectan', () => {
    expect(stairNotice(0)).toBeNull()
    expect(stairNotice(1)).toContain('1 ya no conecta')
    expect(stairNotice(2)).toContain('2 ya no conectan')
  })
})
