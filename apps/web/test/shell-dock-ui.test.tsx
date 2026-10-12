import { Blocks, BrickWall, MousePointer2, Ruler } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Dock, ToolMenu } from '../src/editor/shell/ui/Dock'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}
const ITEMS = [
  { id: 'select', label: 'Seleccionar', icon: MousePointer2 },
  { id: 'structure', label: 'Estructura', icon: Blocks, menu: true },
  { id: 'measure', label: 'Medir', icon: Ruler, menu: true },
] as const
const ENTRIES = [
  { id: 'wall', label: 'Muro', icon: BrickWall, active: true },
  { id: 'slab', label: 'Piso', icon: BrickWall, disabled: true },
] as const


describe('Dock', () => {
  const render = (active: string | null, openMenu: string | null) =>
    renderToStaticMarkup(
      <Dock
        items={ITEMS}
        active={active}
        openMenu={openMenu}
        onSelect={noop}
        menus={{ structure: <ToolMenu title="Estructura" entries={ENTRIES} onPick={noop} onClose={noop} /> }}
      />,
    )

  it('es una barra de herramientas con nombre y un botón por herramienta, con su etiqueta visible', () => {
    const markup = render('select', null)
    expect(markup).toContain('role="toolbar"')
    expect(markup).toContain('aria-label="Herramientas de edición"')
    expect(textOf(markup)).toBe('SeleccionarEstructuraMedir')
    expect(markup.match(/<button /g)).toHaveLength(3)
  })

  it('marca con aria-pressed solo el botón activo, que se ve en azul noche con texto blanco', () => {
    const markup = render('structure', null)
    const pressed = [...markup.matchAll(/aria-pressed="(true|false)"/g)].map((m) => m[1])
    expect(pressed).toEqual(['false', 'true', 'false'])
    expect(markup).toContain('bg-ink text-white')
  })

  it('cada botón mide al menos 44 px (64 × 84)', () => {
    expect(render(null, null)).toContain('h-16 w-[84px]')
  })

  it('los botones con menú anuncian menu y su estado; los demás no', () => {
    const closed = render('select', null)
    expect(closed.match(/aria-haspopup="menu"/g)).toHaveLength(2)
    expect(closed.match(/aria-expanded="false"/g)).toHaveLength(2)
    expect(closed).not.toContain('role="menu"')
    const open = render('structure', 'structure')
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain('role="menu"')
  })
})

describe('ToolMenu', () => {
  const markup = renderToStaticMarkup(<ToolMenu title="Estructura" entries={ENTRIES} onPick={noop} onClose={noop} />)

  it('es un menú con nombre y una entrada por herramienta', () => {
    expect(markup).toContain('role="menu"')
    expect(markup).toContain('aria-label="Estructura"')
    expect(markup.match(/role="menuitem"/g)).toHaveLength(2)
  })

  it('la entrada activa lo indica con aria-current y la deshabilitada no se puede usar', () => {
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1)
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*role="menuitem"|<button[^>]*role="menuitem"[^>]*disabled=""/)
  })
})
