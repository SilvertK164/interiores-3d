import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LevelPanel, LevelPicker, ZoneList } from '../src/editor/shell/ui/LevelPanel'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}
const LEVELS = [
  { id: 'l0', name: 'Planta baja' },
  { id: 'l1', name: 'Planta 1' },
]

describe('LevelPicker', () => {
  const render = (open: boolean, activeId: string | null = 'l0', adding = false) =>
    renderToStaticMarkup(
      <LevelPicker levels={LEVELS} activeId={activeId} open={open} onToggle={noop} onPick={noop} onAdd={noop} adding={adding} />,
    )

  it('cerrado muestra solo la planta activa', () => {
    const markup = render(false)
    expect(textOf(markup)).toBe('Planta baja')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('abierto lista las plantas (la activa con aria-current) y ofrece agregar una', () => {
    const markup = render(true, 'l1')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('aria-label="Plantas"')
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1)
    expect(textOf(markup)).toContain('Agregar planta')
    expect(markup).toMatch(/Planta 1<\/span>/)
  })

  it('mientras se crea una planta el botón queda ocupado y sin doble clic', () => {
    const markup = render(true, 'l0', true)
    expect(markup).toMatch(/<button[^>]*aria-busy="true"[^>]*disabled=""|<button[^>]*disabled=""[^>]*aria-busy="true"/)
  })

  it('sin la opción de agregar (modo Ver) no ofrece crear plantas', () => {
    const markup = renderToStaticMarkup(
      <LevelPicker levels={LEVELS} activeId="l0" open onToggle={noop} onPick={noop} onAdd={noop} canAdd={false} />,
    )
    expect(textOf(markup)).not.toContain('Agregar planta')
    expect(textOf(markup)).toContain('Planta 1')
  })

  it('con plantas pero ninguna activa pide elegir una', () => {
    const markup = renderToStaticMarkup(
      <LevelPicker levels={LEVELS} activeId={null} open={false} onToggle={noop} onPick={noop} onAdd={noop} />,
    )
    expect(textOf(markup)).toBe('Elige una planta')
  })

  it('sin plantas dice "Sin plantas" en lugar de quedar en blanco', () => {
    const markup = renderToStaticMarkup(
      <LevelPicker levels={[]} activeId={null} open={false} onToggle={noop} onPick={noop} onAdd={noop} />,
    )
    expect(textOf(markup)).toBe('Sin plantas')
  })
})

describe('ZoneList y LevelPanel', () => {
  const ZONES = [
    { id: 'z1', name: 'Sala de estar', area: '15,2 m²' },
    { id: 'z2', name: 'Cocina', area: '4,8 m²' },
  ]

  it('cada ambiente muestra su superficie y el elegido queda marcado', () => {
    const markup = renderToStaticMarkup(<ZoneList zones={ZONES} selectedId="z2" onPick={noop} />)
    expect(textOf(markup)).toBe('Sala de estar15,2 m²Cocina4,8 m²')
    expect([...markup.matchAll(/aria-pressed="(true|false)"/g)].map((m) => m[1])).toEqual(['false', 'true'])
  })

  it('en Ver los ambientes se listan pero no se pueden elegir', () => {
    const markup = renderToStaticMarkup(<ZoneList zones={ZONES} selectedId={null} onPick={noop} disabled />)
    expect(markup.match(/disabled=""/g)).toHaveLength(2)
  })

  it('sin ambientes invita a dibujar uno, en castellano', () => {
    const markup = renderToStaticMarkup(<ZoneList zones={[]} selectedId={null} onPick={noop} />)
    expect(textOf(markup)).toBe('Todavía no hay ambientes. Marca uno con Estructura › Ambiente.')
  })

  it('el panel junta el selector y la lista bajo el título "Ambientes"', () => {
    const markup = renderToStaticMarkup(
      <LevelPanel
        picker={{ levels: LEVELS, activeId: 'l0', open: false, onToggle: noop, onPick: noop, onAdd: noop }}
        zones={{ zones: ZONES, selectedId: null, onPick: noop }}
      />,
    )
    expect(markup).toContain('aria-label="Nivel y ambientes"')
    expect(markup).toMatch(/<h2[^>]*>Ambientes<\/h2>/)
    expect(markup).not.toMatch(NO_EMOJI)
  })
})
