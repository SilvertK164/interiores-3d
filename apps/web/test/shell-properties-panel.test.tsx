import { DoorNode, ItemNode, WallNode } from '@pascal-app/core/schema'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { PropertiesPanel } from '../src/editor/shell/PropertiesPanel'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const WALL = WallNode.parse({ start: [0, 0], end: [4, 0] })
const DOOR = DoorNode.parse({ position: [1, 1.05, 0], wallId: WALL.id, parentId: WALL.id })
const SOFA = { id: 'sofa', category: 'furniture', name: 'Sofa', thumbnail: '/items/sofa/thumbnail.webp', src: '/items/sofa/model.glb', dimensions: [2.06, 0.74, 1.01] }
const ITEM = ItemNode.parse({ position: [1, 0, 1], asset: SOFA })
const nodes = (list: object[]) =>
  Object.fromEntries(list.map((n) => [(n as { id: string }).id, n])) as unknown as SceneLike['nodes']

function render(selectedIds: string[], extra: (fake: ReturnType<typeof createFakeDeps>) => void = () => undefined) {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes: nodes([{ ...WALL, children: [DOOR.id] }, DOOR, ITEM, { id: 'slab_1', type: 'slab' }]) })
  fake.viewer.setState({ selection: { buildingId: null, levelId: null, zoneId: null, selectedIds } })
  extra(fake)
  return renderToStaticMarkup(
    <BridgeProvider bridge={createBridge(fake.deps)}>
      <PropertiesPanel />
    </BridgeProvider>,
  )
}

describe('PropertiesPanel', () => {
  it('con nada elegido, con varios o con un elemento que ya no existe no dibuja nada', () => {
    expect(render([])).toBe('')
    expect(render([DOOR.id, ITEM.id])).toBe('')
    expect(render(['item_borrado'])).toBe('')
  })

  it('una puerta muestra su tipo, sus medidas en metros con coma y los botones Duplicar y Borrar', () => {
    const markup = render([DOOR.id])
    const text = textOf(markup)
    expect(markup).toContain('aria-label="Propiedades"')
    for (const word of ['Puerta', 'Batiente de 1 hoja', 'Ancho', 'Alto', 'Hojas', 'Forma del hueco', 'Duplicar', 'Borrar']) {
      expect(text, word).toContain(word)
    }
    expect(markup).toContain('value="0,90 m"')
    expect(markup).toContain('value="2,10 m"')
    expect(text).not.toMatch(/hinged|rectangle|Width|Delete/)
  })

  it('un mueble muestra su nombre en castellano y sus medidas', () => {
    const markup = render([ITEM.id])
    const text = textOf(markup)
    for (const word of ['Sofá', '2,06 × 1,01 m', 'Profundidad', 'Giro']) expect(text, word).toContain(word)
    expect(markup).toContain('value="2,06 m"')
    expect(markup).toContain('value="0°"')
  })

  it('un tipo sin panel propio (piso) muestra solo su nombre y Borrar: sin campos y sin Duplicar', () => {
    const markup = render(['slab_1'])
    const text = textOf(markup)
    expect(text).toContain('Piso')
    expect(text).toContain('Borrar')
    expect(text).not.toContain('Duplicar')
    expect(markup).not.toContain('id="prop-')
  })

  it('en Ver no hay panel de propiedades', () => {
    expect(render([DOOR.id], ({ scene }) => scene.setState({ readOnly: true }))).toBe('')
  })
})
