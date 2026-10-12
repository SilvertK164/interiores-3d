import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlanPreview, type PlanPreviewProps } from '../src/editor/shell/ui/PlanPreview'

const noop = () => {}
const BASE: PlanPreviewProps = {
  status: 'ready',
  blob: null,
  widthMm: 297,
  heightMm: 210,
  alt: 'Vista previa de la hoja del plano con el cajetín y el norte. Vista previa · A4 apaisada (297 × 210 mm) · 1:50',
  caption: 'Vista previa · A4 apaisada (297 × 210 mm) · 1:50',
  mode: 'pdfjs',
  message: 'Cabe en la hoja · usa 64 % del ancho',
  messageTone: 'ok',
  pager: { label: 'Planta baja', index: 0, total: 2, onPrev: noop, onNext: noop },
}
const render = (overrides: Partial<PlanPreviewProps> = {}) => renderToStaticMarkup(<PlanPreview {...BASE} {...overrides} />)
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('vista previa de la hoja', () => {
  it('es una región con la hoja en su proporción real, un lienzo con texto alternativo y la leyenda', () => {
    const markup = render()
    expect(markup).toContain('aria-label="Vista previa"')
    expect(markup).toMatch(/aspect-ratio:\s*297\s*\/\s*210/)
    expect(markup).toMatch(/<canvas[^>]*role="img"/)
    expect(markup).toMatch(/<canvas[^>]*aria-label="Vista previa de la hoja del plano/)
    expect(textOf(markup)).toContain('Vista previa · A4 apaisada (297 × 210 mm) · 1:50')
  })

  it('el mensaje de cabida se anuncia con role="status"', () => {
    const markup = render()
    expect(markup).toMatch(/<p[^>]*role="status"[^>]*>[\s\S]*Cabe en la hoja · usa 64 % del ancho/)
  })

  it('un problema (no cabe, nada que dibujar) también va en el mensaje', () => {
    const markup = render({ message: 'El proyecto no cabe en esta hoja ni a 1:100. Prueba con A3 o quita plantas.', messageTone: 'problem', status: 'idle' })
    expect(textOf(markup)).toContain('El proyecto no cabe en esta hoja ni a 1:100.')
    expect(markup).not.toContain('<canvas')
  })

  it('el paginador dice "Planta baja · 1 de 2", tiene botones con nombre y los de los extremos están deshabilitados', () => {
    const markup = render()
    expect(textOf(markup)).toContain('Planta baja · 1 de 2')
    expect(markup).toContain('aria-label="Planta anterior"')
    expect(markup).toContain('aria-label="Planta siguiente"')
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(1)
    const middle = render({ pager: { label: 'Planta 1', index: 1, total: 3, onPrev: noop, onNext: noop } })
    expect(middle.match(/<button[^>]*disabled=""/g) ?? []).toHaveLength(0)
    expect(render({ pager: null })).not.toContain('Planta anterior')
  })

  it('cargando sin imagen previa muestra el cargador compacto y se marca ocupada', () => {
    const markup = render({ status: 'loading', blob: null })
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('madori-loader')
  })

  it('"no disponible" y el modo cuadro dejan solo el cuadro con el aviso en castellano', () => {
    for (const markup of [render({ status: 'unavailable' }), render({ mode: 'frame' })]) {
      expect(markup).not.toContain('<canvas')
      expect(textOf(markup)).toContain('No pudimos mostrar la vista previa, pero puedes descargar el PDF igual.')
    }
  })

  it('los botones del paginador miden al menos 44 px y sus íconos son decorativos', () => {
    const markup = render()
    expect(markup.match(/size-11/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toMatch(/aria-hidden="true"/)
  })
})
