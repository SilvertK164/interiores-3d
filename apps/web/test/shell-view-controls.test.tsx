import { Footprints, RotateCcw } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ShareRender, ViewBar, ViewPanel } from '../src/editor/shell/ui/ViewControls'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}

describe('controles de Vista 3D', () => {
  it('el panel muestra un grupo de opciones por tema, con la activa marcada', () => {
    const markup = renderToStaticMarkup(
      <ViewPanel
        groups={[{ id: 'walls', title: 'Muros', chips: [{ value: 'up', label: 'Completos' }, { value: 'cutaway', label: 'Cortados' }], active: 'cutaway' }]}
        onPick={noop}
      />,
    )
    expect(markup).toContain('aria-label="Vista 3D"')
    expect(textOf(markup)).toBe('Vista 3DMurosMurosCompletosCortados')
    expect([...markup.matchAll(/aria-pressed="(true|false)"/g)].map((m) => m[1])).toEqual(['false', 'true'])
  })

  it('la barra de cámara es una barra de herramientas con un botón por acción', () => {
    const markup = renderToStaticMarkup(
      <ViewBar actions={[{ id: 'orbit-left', label: 'Girar izq.', icon: RotateCcw }, { id: 'walk', label: 'Recorrer', icon: Footprints }]} onAction={noop} />,
    )
    expect(markup).toContain('role="toolbar"')
    expect(markup).toContain('aria-label="Cámara"')
    expect(textOf(markup)).toBe('Girar izq.Recorrer')
    expect(markup).toContain('h-16 w-[100px]')
  })

  it('Compartir y Renderizar se ven deshabilitados con "Pronto"', () => {
    const markup = renderToStaticMarkup(<ShareRender />)
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2)
    expect(textOf(markup)).toContain('Compartir')
    expect(textOf(markup)).toContain('Renderizar')
    expect(markup.match(/Pronto/g)).toHaveLength(2)
  })

  it('Exportar plano está activo junto a Compartir y Renderizar', () => {
    const markup = renderToStaticMarkup(<ShareRender onExportPlan={noop} />)
    expect(textOf(markup)).toContain('Exportar plano')
    const exportButton = markup.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Exportar plano<\/button>/g) ?? []
    expect(exportButton).toHaveLength(1)
    expect(exportButton[0]).not.toContain('disabled')
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2)
  })
})
