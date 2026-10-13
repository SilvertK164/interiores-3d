import { describe, expect, it } from 'vitest'
import { defaultLevelName, levelDisplayName, zoneDisplayName } from '../src/lib/editor-names'
import { formatArea } from '../src/lib/format'

describe('nombres de planta (D10: se muestran en castellano sin tocar el dato guardado)', () => {
  it('una planta sin nombre se ve como Planta baja, Planta N o Sótano N', () => {
    expect(levelDisplayName({ level: 0 })).toBe('Planta baja')
    expect(levelDisplayName({ level: 1 })).toBe('Planta 1')
    expect(levelDisplayName({ level: 2, name: '' })).toBe('Planta 2')
    expect(levelDisplayName({ level: 3, name: '   ' })).toBe('Planta 3')
    expect(levelDisplayName({ level: -1, name: null })).toBe('Sótano 1')
    expect(defaultLevelName(-2)).toBe('Sótano 2')
  })

  it('los nombres por defecto que Pascal guarda en inglés también se muestran en castellano', () => {
    expect(levelDisplayName({ level: 0, name: 'Ground Floor' })).toBe('Planta baja')
    expect(levelDisplayName({ level: 1, name: 'Floor 1' })).toBe('Planta 1')
    expect(levelDisplayName({ level: -1, name: 'Basement 1' })).toBe('Sótano 1')
  })

  it('un nombre que puso la persona se respeta tal cual', () => {
    expect(levelDisplayName({ level: 0, name: 'Altillo' })).toBe('Altillo')
    expect(levelDisplayName({ level: 1, name: 'Floor plan final' })).toBe('Floor plan final')
  })
})

describe('nombres de ambiente', () => {
  it('"Zone N" (lo que nombra la herramienta de Pascal) se muestra "Ambiente N"; lo demás no cambia', () => {
    expect(zoneDisplayName('Zone 1')).toBe('Ambiente 1')
    expect(zoneDisplayName('Zone 12')).toBe('Ambiente 12')
    expect(zoneDisplayName('Sala de estar')).toBe('Sala de estar')
    expect(zoneDisplayName('')).toBe('Ambiente sin nombre')
    expect(zoneDisplayName(undefined)).toBe('Ambiente sin nombre')
  })
})

describe('formatArea', () => {
  it('usa coma decimal, un decimal y un espacio antes de m² (no el "15.2m²" de Pascal)', () => {
    expect(formatArea(15.2)).toBe('15,2 m²')
    expect(formatArea(4.84)).toBe('4,8 m²')
    expect(formatArea(0)).toBe('0,0 m²')
    expect(formatArea(1234.56)).toBe('1.234,6 m²')
  })

  it('un valor que no es número no rompe la lista de ambientes', () => {
    expect(formatArea(Number.NaN)).toBe('0,0 m²')
  })
})
