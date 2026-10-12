import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlanOptions, type PlanOptionsProps } from '../src/editor/shell/ui/PlanOptions'

const noop = () => {}
const SCALES: PlanOptionsProps['scales'] = [
  { scale: 25, enabled: false, reason: '1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm. Mejor ajuste: 1:50.' },
  { scale: 50, enabled: true, reason: null },
  { scale: 100, enabled: true, reason: null },
]
const LEVELS: PlanOptionsProps['levels'] = [
  { id: 'a', label: 'Planta baja', empty: false, checked: true },
  { id: 'b', label: 'Planta 1', empty: false, checked: true },
  { id: 'c', label: 'Altillo', empty: true, checked: false },
]
const BASE: PlanOptionsProps = {
  paper: 'A4',
  orientation: 'landscape',
  scale: 50,
  mode: 'paper',
  titleBlock: true,
  suggestedOrientation: 'landscape',
  scales: SCALES,
  levels: LEVELS,
  busy: false,
  onPaper: noop,
  onOrientation: noop,
  onScale: noop,
  onMode: noop,
  onTitleBlock: noop,
  onToggleLevel: noop,
}
const render = (overrides: Partial<PlanOptionsProps> = {}) => renderToStaticMarkup(<PlanOptions {...BASE} {...overrides} />)
const inputs = (markup: string) => markup.match(/<input[^>]*>/g) ?? []
const input = (markup: string, type: string, value: string) => inputs(markup).find((tag) => tag.includes(`type="${type}"`) && tag.includes(`value="${value}"`)) ?? ''
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('plantas y cajetín (criterio 15)', () => {
  const markup = render()

  it('las plantas son un grupo más, con su título y una casilla por planta', () => {
    expect(markup.match(/<fieldset/g)).toHaveLength(5)
    expect(markup).toMatch(/<legend[^>]*>Plantas<\/legend>/)
    expect(inputs(markup).filter((tag) => tag.includes('type="checkbox"') && tag.includes('value='))).toHaveLength(3)
    expect(textOf(markup)).toContain('Planta baja')
    expect(textOf(markup)).toContain('Planta 1')
    expect(textOf(markup)).toContain('Incluir cajetín')
  })

  it('una planta vacía va deshabilitada, desmarcada y con "(vacía)"', () => {
    const tag = input(markup, 'checkbox', 'c')
    expect(tag).toContain('disabled=""')
    expect(tag).not.toContain('checked=""')
    expect(textOf(markup)).toContain('Altillo (vacía)')
    expect(markup).toContain('Esta planta no tiene nada dibujado.')
  })

  it('la última planta marcada no se puede desmarcar y dice por qué', () => {
    const only = render({ levels: [{ id: 'a', label: 'Planta baja', empty: false, checked: true }, { id: 'b', label: 'Planta 1', empty: false, checked: false }] })
    expect(input(only, 'checkbox', 'a')).toContain('disabled=""')
    expect(input(only, 'checkbox', 'b')).not.toContain('disabled')
    expect(only).toContain('Tiene que quedar al menos una planta marcada.')
    expect(input(markup, 'checkbox', 'a')).not.toContain('disabled')
  })

  it('"Incluir cajetín" es un interruptor con su ayuda', () => {
    const tag = inputs(markup).find((t) => t.includes('role="switch"')) ?? ''
    expect(tag).toContain('checked=""')
    expect(textOf(markup)).toContain('Proyecto, escala, fecha y autor')
    expect(inputs(render({ titleBlock: false })).find((t) => t.includes('role="switch"'))).not.toContain('checked=""')
  })

  it('mientras genera, las casillas y el interruptor quedan deshabilitados', () => {
    for (const tag of inputs(render({ busy: true })).filter((t) => t.includes('type="checkbox"'))) expect(tag).toContain('disabled=""')
  })

  it('los objetivos táctiles de las plantas y del interruptor miden al menos 44 px', () => {
    expect(markup.match(/min-h-11/g)?.length ?? 0).toBeGreaterThanOrEqual(13)
  })
})
