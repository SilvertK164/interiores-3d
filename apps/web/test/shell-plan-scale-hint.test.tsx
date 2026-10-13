import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlanOptions, type PlanOptionsProps } from '../src/editor/shell/ui/PlanOptions'
import { scaleEquivalence } from '../src/lib/export/texts-es'

const noop = () => {}
const ALL_FIT: PlanOptionsProps['scales'] = [
  { scale: 25, enabled: true, reason: null },
  { scale: 50, enabled: true, reason: null },
  { scale: 100, enabled: true, reason: null },
]
const ONE_BLOCKED: PlanOptionsProps['scales'] = [
  { scale: 25, enabled: false, reason: '1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm. Mejor ajuste: 1:50.' },
  { scale: 50, enabled: true, reason: null },
  { scale: 100, enabled: true, reason: null },
]
const BASE: PlanOptionsProps = {
  paper: 'A3',
  orientation: 'landscape',
  scale: 25,
  mode: 'paper',
  titleBlock: true,
  suggestedOrientation: 'landscape',
  scales: ALL_FIT,
  levels: [{ id: 'a', label: 'Planta baja', empty: false, checked: true }],
  busy: false,
  onPaper: noop,
  onOrientation: noop,
  onScale: noop,
  onMode: noop,
  onTitleBlock: noop,
  isometric: true,
  onIsometric: noop,
  onToggleLevel: noop,
}
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('qué mide la escala elegida (lámina 19: "1 cm en el papel = 0,25 m real")', () => {
  it('dice cuánto es 1 cm del papel en metros reales, con coma decimal', () => {
    expect(scaleEquivalence(25)).toBe('1 cm en el papel = 0,25 m real')
    expect(scaleEquivalence(50)).toBe('1 cm en el papel = 0,5 m real')
    expect(scaleEquivalence(100)).toBe('1 cm en el papel = 1 m real')
  })

  it('con todas las escalas disponibles el diálogo muestra la equivalencia de la elegida', () => {
    expect(textOf(renderToStaticMarkup(<PlanOptions {...BASE} />))).toContain('1 cm en el papel = 0,25 m real')
    expect(textOf(renderToStaticMarkup(<PlanOptions {...BASE} scale={100} />))).toContain('1 cm en el papel = 1 m real')
  })

  it('si alguna escala no cabe, en su lugar va el motivo y el mejor ajuste (lámina 24)', () => {
    const text = textOf(renderToStaticMarkup(<PlanOptions {...BASE} paper="A4" scale={50} scales={ONE_BLOCKED} />))
    expect(text).toContain('1:25 no cabe en A4')
    expect(text).toContain('Mejor ajuste: 1:50.')
    expect(text).not.toContain('en el papel =')
  })
})
