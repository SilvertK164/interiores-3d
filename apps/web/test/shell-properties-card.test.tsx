import { DoorOpen } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PropertiesCard } from '../src/editor/shell/ui/PropertiesCard'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}
const FIELDS = [
  { kind: 'select', id: 'doorType', label: 'Tipo', value: 'hinged', options: [{ value: 'hinged', label: 'Batiente' }, { value: 'double', label: 'Doble' }] },
  { kind: 'number', id: 'width', label: 'Ancho', value: '0,90 m' },
  { kind: 'text', id: 'name', label: 'Nombre', value: 'Puerta 1' },
  { kind: 'swatch', id: 'color', label: 'Color', value: '#1F5FE0', options: [{ value: '#1F5FE0', label: 'Cobalto', color: '#1F5FE0' }, { value: '#FFB02E', label: 'Sol', color: '#FFB02E' }] },
  { kind: 'readonly', id: 'area', label: 'Superficie', value: '15,2 m²' },
] as const

const render = (extra: Partial<Parameters<typeof PropertiesCard>[0]> = {}) =>
  renderToStaticMarkup(
    <PropertiesCard
      title="Puerta"
      subtitle="Batiente de 1 hoja"
      icon={DoorOpen}
      fields={FIELDS}
      onCommit={noop}
      onClose={noop}
      onDelete={noop}
      onConfirmDelete={noop}
      onCancelDelete={noop}
      {...extra}
    />,
  )


describe('PropertiesCard', () => {
  it('muestra el título, el subtítulo y un botón de cerrar con nombre', () => {
    const markup = render()
    expect(markup).toMatch(/<h2[^>]*>Puerta<\/h2>/)
    expect(markup).toContain('Batiente de 1 hoja')
    expect(markup).toContain('aria-label="Cerrar propiedades"')
    expect(markup).toContain('aria-label="Propiedades"')
  })

  it('cada campo tiene su etiqueta asociada por id y el valor ya formateado', () => {
    const markup = render()
    for (const id of ['doorType', 'width', 'name', 'area']) {
      expect(markup, id).toContain(`for="prop-${id}"`)
      expect(markup, id).toContain(`id="prop-${id}"`)
    }
    expect(markup).toContain('value="0,90 m"')
    expect(markup).toContain('inputMode="decimal"')
    expect(markup).toMatch(/<option value="hinged" selected="">Batiente<\/option>|<option selected="" value="hinged">Batiente<\/option>/)
  })

  it('los colores son un grupo de botones con nombre y el elegido marcado', () => {
    const markup = render()
    expect(markup).toMatch(/<legend[^>]*>Color<\/legend>/)
    const swatches = [...markup.matchAll(/<button[^>]*aria-label="(Cobalto|Sol)"[^>]*>/g)]
    expect(swatches.map((m) => [m[1], /aria-pressed="true"/.test(m[0])])).toEqual([['Cobalto', true], ['Sol', false]])
  })

  it('Duplicar solo aparece si se pasa onDuplicate; Borrar siempre', () => {
    expect(textOf(render())).not.toContain('Duplicar')
    expect(textOf(render({ onDuplicate: noop }))).toContain('Duplicar')
    expect(textOf(render())).toContain('Borrar')
  })

  it('al confirmar el borrado reemplaza las acciones por el aviso con Cancelar y Borrar', () => {
    const markup = render({ onDuplicate: noop, confirmMessage: 'Este muro tiene 2 aberturas que también se borrarán.' })
    expect(markup).toContain('role="alert"')
    expect(textOf(markup)).toContain('Este muro tiene 2 aberturas que también se borrarán.')
    expect(textOf(markup)).toContain('Cancelar')
    expect(textOf(markup)).not.toContain('Duplicar')
  })

  it('no usa emojis', () => {
    expect(render({ onDuplicate: noop })).not.toMatch(NO_EMOJI)
  })
})
