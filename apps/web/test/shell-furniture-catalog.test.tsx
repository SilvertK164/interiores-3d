import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FurnitureCatalog } from '../src/editor/shell/ui/FurnitureCatalog'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}

describe('FurnitureCatalog', () => {
  const CHIPS = [
    { id: 'todos', label: 'Todos' },
    { id: 'estar', label: 'Estar' },
  ]
  const CARDS = [
    { id: 'sofa', name: 'Sofá', size: '2,06 × 1,01 m', thumbnail: '/items/sofa/thumbnail.webp', selected: false },
    { id: 'cactus', name: 'Cactus', size: '0,34 × 0,27 m', thumbnail: '/items/cactus/thumbnail.webp', selected: true },
  ]
  const render = (cards = CARDS, query = '') =>
    renderToStaticMarkup(
      <FurnitureCatalog query={query} onQuery={noop} chips={CHIPS} chip="estar" onChip={noop} cards={cards} onPick={noop} />,
    )

  it('tiene título, buscador con etiqueta, categorías y el botón "Subir mi mueble" deshabilitado con "Pronto"', () => {
    const markup = render()
    expect(markup).toContain('aria-label="Muebles"')
    expect(markup).toContain('type="search"')
    expect(markup).toContain('Buscar muebles')
    expect(markup).toContain('placeholder="Buscar sofá, cama, mesa…"')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*Subir mi mueble[\s\S]*Pronto/)
  })

  it('las categorías marcan la elegida y cada tarjeta muestra miniatura, nombre y medidas', () => {
    const markup = render()
    const chips = [...markup.matchAll(/aria-pressed="(true|false)"[^>]*>([^<]+)<\/button>/g)]
    expect(chips.map((m) => [m[1], m[2]])).toEqual([['false', 'Todos'], ['true', 'Estar']])
    expect(markup).toContain('src="/items/sofa/thumbnail.webp"')
    expect(markup).toContain('2,06 × 1,01 m')
    expect(markup.match(/<li>/g)).toHaveLength(2)
  })

  it('la tarjeta del mueble que se está colocando queda marcada', () => {
    const markup = render()
    expect(markup.match(/<li><button[^>]*aria-pressed="true"/g)).toHaveLength(1)
  })

  it('sin resultados lo dice y no dibuja una lista vacía', () => {
    const markup = render([], 'zzz')
    expect(textOf(markup)).toContain('No encontramos muebles con ese nombre.')
    expect(markup).not.toContain('<li>')
    expect(markup).toContain('value="zzz"')
  })
})
