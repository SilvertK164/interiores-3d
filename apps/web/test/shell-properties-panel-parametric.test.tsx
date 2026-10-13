import { CabinetNode, ShelfNode, StairNode, StairSegmentNode } from '@pascal-app/core/schema'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { PropertiesPanel } from '../src/editor/shell/PropertiesPanel'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const SHELF = ShelfNode.parse({ position: [1, 0, 1], style: 'bookshelf', width: 1, depth: 0.5, height: 1.8, rows: 3, columns: 2, withBack: true })
const CABINET = CabinetNode.parse({})
const FLIGHT = StairSegmentNode.parse({})
const STRAIGHT = StairNode.parse({ children: [FLIGHT.id] })
const SPIRAL = StairNode.parse({ stairType: 'spiral' })
const nodes = Object.fromEntries([SHELF, CABINET, FLIGHT, STRAIGHT, SPIRAL].map((n) => [n.id, n])) as unknown as SceneLike['nodes']

function render(id: string) {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes })
  fake.viewer.setState({ selection: { buildingId: null, levelId: null, zoneId: null, selectedIds: [id] } })
  return renderToStaticMarkup(
    <BridgeProvider bridge={createBridge(fake.deps)}>
      <PropertiesPanel />
    </BridgeProvider>,
  )
}

describe('PropertiesPanel con los tipos paramétricos', () => {
  it('un estante muestra sus medidas, filas, columnas e interruptores, con Duplicar y su ícono', () => {
    const markup = render(SHELF.id)
    for (const word of ['Biblioteca', 'Ancho', 'Fondo', 'Alto', 'Filas', 'Columnas', 'Panel trasero', 'Duplicar', 'Borrar']) {
      expect(textOf(markup), word).toContain(word)
    }
    expect(markup).toContain('value="1,00 m"')
    expect(markup).toContain('lucide-library')
    expect(textOf(markup)).not.toMatch(/withBack|Width|Rows/)
  })

  it('un gabinete muestra su alto del cuerpo, sin Duplicar, con su ícono', () => {
    const markup = render(CABINET.id)
    expect(textOf(markup)).toContain('Alto del cuerpo')
    expect(textOf(markup)).not.toContain('Duplicar')
    expect(markup).toContain('lucide-archive')
  })

  it('una escalera de caracol muestra Ancho y Escalones', () => {
    const markup = render(SPIRAL.id)
    for (const word of ['Escalera', 'Caracol', 'Escalones']) expect(textOf(markup), word).toContain(word)
    expect(markup).toContain('value="10"')
  })

  it('una escalera recta pide elegir un tramo y no muestra Escalones', () => {
    const text = textOf(render(STRAIGHT.id))
    expect(text).toContain('Tramos')
    expect(text).toContain('Elige un tramo para cambiar sus medidas')
    expect(text).not.toContain('Escalones')
  })

  it('un tramo muestra su título y sus escalones', () => {
    const text = textOf(render(FLIGHT.id))
    for (const word of ['Tramo de escalera', 'Ancho', 'Escalones', '10 escalones']) expect(text, word).toContain(word)
  })
})
