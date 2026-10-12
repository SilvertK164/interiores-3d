import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { leftPanelFor } from '../src/editor/shell/dock-model'
import { FurniturePanel } from '../src/editor/shell/FurniturePanel'
import { LeftPanel } from '../src/editor/shell/LeftPanel'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const CATALOG = [
  { id: 'sofa', name: 'Sofa', dimensions: [2.06, 0.74, 1.01] as const, thumbnail: '/items/sofa/thumbnail.webp' },
  { id: 'double-bed', name: 'Double Bed', dimensions: [1.52, 0.71, 2] as const, thumbnail: '/items/double-bed/thumbnail.webp' },
]

function render(node: React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  return renderToStaticMarkup(<BridgeProvider bridge={createBridge(fake.deps)}>{node}</BridgeProvider>)
}

describe('leftPanelFor', () => {
  it('Muebles trae el catálogo, Materiales las muestras y todo lo demás las plantas y ambientes', () => {
    expect(leftPanelFor('furniture')).toBe('furniture')
    expect(leftPanelFor('materials')).toBe('materials')
    for (const id of ['select', 'structure', 'openings', 'measure', 'more', null] as const) {
      expect(leftPanelFor(id)).toBe('levels')
    }
  })
})

describe('FurniturePanel', () => {
  it('muestra las tarjetas en castellano, con medidas y miniatura, todas las categorías y el botón Pronto', () => {
    const markup = render(<FurniturePanel items={CATALOG} />)
    const text = textOf(markup)
    expect(text).toContain('Cama doble')
    expect(text).toContain('Sofá')
    expect(text).toContain('2,06 × 1,01 m')
    expect(text).toContain('Comercio')
    expect(text).toContain('Subir mi mueble')
    expect(text).not.toMatch(/Sofa|Double Bed/)
    expect(markup).toContain('src="/items/sofa/thumbnail.webp"')
  })

  it('marca la tarjeta del mueble que Pascal tiene elegido para colocar', () => {
    const markup = render(<FurniturePanel items={CATALOG} />, ({ editor }) => editor.setState({ selectedItem: { id: 'sofa' } }))
    expect(markup.match(/<li><button[^>]*aria-pressed="true"/g)).toHaveLength(1)
  })
})

describe('LeftPanel', () => {
  const leftOf = (setup?: Parameters<typeof render>[1]) => render(<LeftPanel catalog={CATALOG} />, setup)

  it('con la herramienta de muro armada (un proyecto en blanco) muestra plantas y ambientes', () => {
    expect(leftOf()).toContain('aria-label="Nivel y ambientes"')
  })

  it('con la herramienta de muebles armada muestra el catálogo', () => {
    const markup = leftOf(({ editor }) => editor.setState({ mode: 'build', tool: 'item' }))
    expect(markup).toContain('aria-label="Muebles"')
    expect(markup).not.toContain('aria-label="Nivel y ambientes"')
  })

  it('con la pintura armada muestra los materiales', () => {
    const markup = leftOf(({ editor }) => editor.setState({ mode: 'material-paint', tool: null }))
    expect(markup).toContain('aria-label="Materiales"')
    expect(markup).not.toContain('aria-label="Nivel y ambientes"')
  })

  it('en Ver siempre muestra plantas y ambientes, aunque la herramienta de muebles estuviera armada', () => {
    const markup = leftOf(({ editor, scene }) => {
      editor.setState({ mode: 'build', tool: 'item' })
      scene.setState({ readOnly: true })
    })
    expect(markup).toContain('aria-label="Nivel y ambientes"')
  })
})
