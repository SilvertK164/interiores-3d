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

describe('opciones del diálogo (criterio 15)', () => {
  const markup = render()

  it('hoja, orientación, escala y modo son grupos con su título y opciones de radio, con la elegida marcada', () => {
    for (const legend of ['Hoja', 'Orientación', 'Escala', 'Modo']) {
      expect(markup, legend).toMatch(new RegExp(`<legend[^>]*>${legend}</legend>`))
    }
    expect(inputs(markup).filter((tag) => tag.includes('type="radio"'))).toHaveLength(9)
    for (const [value, checked] of [['A4', true], ['A3', false], ['landscape', true], ['portrait', false], ['50', true], ['100', false], ['paper', true], ['color', false]] as const) {
      expect(input(markup, 'radio', value).includes('checked=""'), value).toBe(checked)
    }
  })

  it('las opciones se llaman en castellano y no traen emojis', () => {
    const text = textOf(markup)
    for (const label of ['A4', 'A3', 'Apaisada', 'Vertical', '1:25', '1:50', '1:100', 'Papel', 'Color']) {
      expect(text, label).toContain(label)
    }
    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(markup).not.toMatch(/\b(Floor|Level|Scale|Sheet)\b/)
  })

  it('1:25 está deshabilitada y explica su motivo con aria-describedby y con un texto visible', () => {
    const tag = input(markup, 'radio', '25')
    expect(tag).toContain('disabled=""')
    const describedBy = /aria-describedby="([^"]+)"/.exec(tag)?.[1]
    expect(describedBy).toBeTruthy()
    expect(markup).toMatch(new RegExp(`<span[^>]*id="${describedBy}"[^>]*>1:25 no cabe en A4`))
    expect(markup).toMatch(/<p[^>]*>1:25 no cabe en A4: necesita 352 mm de ancho/)
    expect(input(markup, 'radio', '50')).not.toContain('disabled')
  })

  it('"Sugerida" acompaña a la orientación que permite la escala mayor', () => {
    const labelOf = (html: string, value: string) => html.split('<label').find((part) => part.includes(`value="${value}"`)) ?? ''
    const portrait = render({ suggestedOrientation: 'portrait' })
    expect(labelOf(portrait, 'portrait')).toContain('Sugerida')
    expect(labelOf(portrait, 'landscape')).not.toContain('Sugerida')
    expect(markup.match(/Sugerida/g)).toHaveLength(1)
    expect(labelOf(markup, 'landscape')).toContain('Sugerida')
  })

  it('mientras genera, todas las opciones quedan deshabilitadas', () => {
    for (const tag of inputs(render({ busy: true }))) expect(tag).toContain('disabled=""')
  })

  it('los objetivos táctiles miden al menos 44 px y los íconos son decorativos', () => {
    expect(markup.match(/min-h-11/g)?.length ?? 0).toBeGreaterThanOrEqual(9)
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toContain('aria-hidden="true"')
  })
})
