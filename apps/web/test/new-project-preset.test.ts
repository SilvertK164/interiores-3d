import { describe, expect, it } from 'vitest'
import { DEFAULT_KIND, firstTemplateOf, parseNewProjectParam, presetInitialState } from '../src/lib/new-project-preset'

describe('parseNewProjectParam: ?nuevo= de /proyectos', () => {
  it('vivienda y comercio marcan el tipo', () => {
    expect(parseNewProjectParam('?nuevo=vivienda')).toEqual({ kind: 'vivienda' })
    expect(parseNewProjectParam('?nuevo=comercio')).toEqual({ kind: 'comercio' })
  })

  it('blanco pide el diálogo con "En blanco" marcado', () => {
    expect(parseNewProjectParam('?nuevo=blanco')).toEqual({ blank: true })
  })

  it('sin parámetro, vacío o con otro valor no abre nada', () => {
    for (const search of ['', '?', '?x=1', '?nuevo=', '?nuevo=otra', '?nuevo=VIVIENDA', '?nuevo=vivienda%20']) {
      expect(parseNewProjectParam(search), search).toBeNull()
    }
  })

  it('acepta la búsqueda con o sin "?" y entre otros parámetros', () => {
    expect(parseNewProjectParam('nuevo=comercio')).toEqual({ kind: 'comercio' })
    expect(parseNewProjectParam('?a=1&nuevo=blanco&b=2')).toEqual({ blank: true })
  })
})

describe('presetInitialState: cómo abre el diálogo', () => {
  it('sin preajuste abre como siempre: comercio con su primera plantilla', () => {
    expect(DEFAULT_KIND).toBe('comercio')
    expect(presetInitialState()).toEqual({ kind: 'comercio', templateId: 'concept-store' })
    expect(presetInitialState(null)).toEqual({ kind: 'comercio', templateId: 'concept-store' })
  })

  it('con el tipo marcado elige la primera plantilla de ese tipo (igual que al marcarlo a mano)', () => {
    expect(presetInitialState({ kind: 'vivienda' })).toEqual({ kind: 'vivienda', templateId: firstTemplateOf('vivienda') })
    expect(presetInitialState({ kind: 'vivienda' }).templateId).toBe('loft')
    expect(presetInitialState({ kind: 'comercio' })).toEqual({ kind: 'comercio', templateId: 'concept-store' })
  })

  it('con una plantilla del mosaico marca esa plantilla y su tipo', () => {
    expect(presetInitialState({ templateId: 'loft' })).toEqual({ kind: 'vivienda', templateId: 'loft' })
    expect(presetInitialState({ templateId: 'cafe' })).toEqual({ kind: 'comercio', templateId: 'cafe' })
  })

  it('una plantilla que no existe vuelve a lo de siempre', () => {
    expect(presetInitialState({ templateId: 'no-existe' })).toEqual({ kind: 'comercio', templateId: 'concept-store' })
  })

  it('"En blanco" deja el tipo de siempre y sin plantilla', () => {
    expect(presetInitialState({ blank: true })).toEqual({ kind: 'comercio', templateId: null })
  })
})
