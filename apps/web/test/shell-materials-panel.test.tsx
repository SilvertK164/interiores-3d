import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { Swatch } from '../src/editor/shell/materials-model'
import { MaterialsPanel } from '../src/editor/shell/MaterialsPanel'
import { MaterialsCatalog } from '../src/editor/shell/ui/MaterialsCatalog'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => undefined
const TABS = [
  { value: 'floor', label: 'Suelo' },
  { value: 'wall', label: 'Muros' },
]
const CATEGORIES = [
  { value: 'wood', label: 'Madera' },
  { value: 'colors', label: 'Colores' },
]
const SWATCHES: Swatch[] = [
  { id: 'wood-woodfine1', name: 'Madera fina 1', thumbnail: '/material/wood/1.webp', selected: true },
  { id: 'preset-white', name: 'Blanco', color: '#e9e9e9', selected: false },
]
const catalog = (swatches: readonly Swatch[]) =>
  renderToStaticMarkup(
    <MaterialsCatalog tabs={TABS} tab="floor" onTab={noop} categories={CATEGORIES} category="wood" onCategory={noop} swatches={swatches} onPick={noop} />,
  )

describe('MaterialsCatalog', () => {
  it('muestra el título, las superficies, las categorías y cada muestra con su nombre', () => {
    const markup = catalog(SWATCHES)
    const text = textOf(markup)
    for (const word of ['Materiales', 'Suelo', 'Muros', 'Madera', 'Colores', 'Madera fina 1', 'Blanco']) expect(text).toContain(word)
    expect(markup).toContain('aria-label="Materiales"')
  })

  it('marca la superficie y la categoría activas, y la muestra elegida; la de color liso pinta su cuadro', () => {
    const markup = catalog(SWATCHES)
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(3) // Suelo, Madera y la muestra elegida
    expect(markup).toContain('src="/material/wood/1.webp"')
    expect(markup).toContain('background-color:#e9e9e9')
  })

  it('"Color personalizado" está deshabilitado con "Pronto"', () => {
    const markup = catalog(SWATCHES)
    expect(textOf(markup)).toContain('Color personalizado')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Color personalizado/)
    expect(textOf(markup)).toContain('Pronto')
  })

  it('sin muestras avisa en castellano en lugar de dejar la grilla vacía', () => {
    expect(textOf(catalog([]))).toContain('No hay materiales para esta superficie.')
  })
})

describe('MaterialsPanel', () => {
  const render = (setup?: (model: ReturnType<ReturnType<typeof createFakeDeps>['deps']['useMaterialsModel']>) => void) => {
    const { deps } = createFakeDeps()
    setup?.(deps.useMaterialsModel())
    return renderToStaticMarkup(
      <BridgeProvider bridge={createBridge(deps)}>
        <MaterialsPanel />
      </BridgeProvider>,
    )
  }

  it('arranca en Suelo y Madera, con los nombres en castellano y sin el inglés de Pascal', () => {
    const markup = render()
    const text = textOf(markup)
    for (const word of ['Suelo', 'Muros', 'Muebles', 'Techo', 'Madera', 'Madera fina 1']) expect(text).toContain(word)
    expect(text).not.toMatch(/Wood Fine|White|Clay Tiles/)
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(2) // Suelo y Madera
  })

  it('marca el material que Pascal tiene armado para pintar', () => {
    const markup = render((model) => {
      model.selectedId = 'wood-woodfine1'
    })
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(3) // Suelo, Madera y la muestra
  })
})
