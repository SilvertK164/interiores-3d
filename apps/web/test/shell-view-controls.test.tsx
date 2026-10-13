import { Footprints, RotateCcw } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ExportButtons, ViewBar, ViewPanel } from '../src/editor/shell/ui/ViewControls'

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

  it('ofrece Exportar imagen 3D y Exportar plano, ambos activos y sin Compartir, Renderizar ni "Pronto"', () => {
    const markup = renderToStaticMarkup(<ExportButtons onExportPlan={noop} onExportImage={noop} />)
    expect(textOf(markup)).toBe('ColorBlanco y negroExportar imagen 3DExportar plano')
    expect(markup).not.toMatch(/<button[^>]*disabled=""/)
    expect(markup).toContain('aria-label="Estilo de la imagen 3D"')
    expect(markup).not.toContain('Pronto')
  })

  it('mientras genera la imagen, su botón queda deshabilitado y lo dice', () => {
    const markup = renderToStaticMarkup(<ExportButtons imageBusy />)
    expect(textOf(markup)).toContain('Generando imagen…')
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(1)
  })
})
