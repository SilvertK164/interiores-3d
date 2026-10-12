import { Eye } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Segmented } from '../src/editor/shell/ui/primitives'
import { TopBar } from '../src/editor/shell/ui/TopBar'
import { UndoRedo } from '../src/editor/shell/ui/UndoRedo'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const noop = () => {}

describe('UndoRedo', () => {
  it('sin historial ambos botones quedan deshabilitados y con nombre accesible', () => {
    const markup = renderToStaticMarkup(<UndoRedo canUndo={false} canRedo={false} onUndo={noop} onRedo={noop} />)
    expect(markup).toContain('aria-label="Deshacer"')
    expect(markup).toContain('aria-label="Rehacer"')
    expect(markup.match(/disabled=""/g)).toHaveLength(2)
  })

  it('con algo que deshacer solo Rehacer sigue deshabilitado', () => {
    const markup = renderToStaticMarkup(<UndoRedo canUndo canRedo={false} onUndo={noop} onRedo={noop} />)
    expect(markup.match(/disabled=""/g)).toHaveLength(1)
    expect(/aria-label="Rehacer"[^>]*disabled=""|disabled=""[^>]*aria-label="Rehacer"/.test(markup)).toBe(true)
  })
})

describe('TopBar', () => {
  const render = (backBusy?: boolean) =>
    renderToStaticMarkup(
      <TopBar
        name="Loft Palermo"
        saveState="guardado"
        onBack={noop}
        backBusy={backBusy}
        center={<Segmented label="Modo del editor" items={[{ id: 'ver', icon: Eye, label: 'Ver' }]} value="ver" />}
        right={<span>vista</span>}
      />,
    )

  it('muestra volver, el nombre del proyecto como título, el chip de guardado y las dos piezas', () => {
    const markup = render()
    expect(markup).toContain('aria-label="Volver a mis proyectos"')
    expect(markup).toMatch(/<h1[^>]*>Loft Palermo<\/h1>/)
    expect(markup).toContain('data-testid="save-status"')
    expect(markup).toContain('Modo del editor')
    expect(markup).toContain('<span>vista</span>')
  })

  it('mientras vuelve, el botón queda ocupado y deshabilitado (sin doble clic)', () => {
    expect(render(true)).toMatch(/aria-busy="true"/)
    expect(render(true)).toMatch(/disabled=""/)
    expect(render()).not.toContain('aria-busy')
  })

  it('no usa emojis', () => {
    expect(render()).not.toMatch(NO_EMOJI)
  })
})
