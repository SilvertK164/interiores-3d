import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { LevelsPanel } from '../src/editor/shell/LevelsPanel'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const ENGLISH = /Ground Floor|Floor \d|Basement|Zone \d/

function render(setup: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup(fake)
  return renderToStaticMarkup(
    <BridgeProvider bridge={createBridge(fake.deps)}>
      <LevelsPanel />
    </BridgeProvider>,
  )
}
const loft = (fake: ReturnType<typeof createFakeDeps>) => {
  fake.scene.setState({
    nodes: {
      building_1: { id: 'building_1', type: 'building', children: ['level_a', 'level_b'] },
      level_a: { id: 'level_a', type: 'level', level: 0, children: ['zone_1', 'zone_2'] },
      level_b: { id: 'level_b', type: 'level', level: 1, name: 'Floor 1', children: [] },
      zone_1: { id: 'zone_1', type: 'zone', name: 'Zone 1', polygon: [[0, 0], [4, 0], [4, 3.8], [0, 3.8]] },
      zone_2: { id: 'zone_2', type: 'zone', name: 'Cocina', polygon: [[0, 0], [2, 0], [2, 2.4], [0, 2.4]] },
    } as unknown as SceneLike['nodes'],
  })
  fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId: 'zone_2', selectedIds: [] } })
}

describe('LevelsPanel', () => {
  it('muestra la planta activa, los ambientes con su superficie en castellano y el elegido marcado', () => {
    const markup = render(loft)
    const text = textOf(markup)
    expect(text).toContain('Planta baja')
    expect(text).toContain('Ambiente 1')
    expect(text).toContain('15,2 m²')
    expect(text).toContain('Cocina')
    expect(text).toContain('4,8 m²')
    expect(text).not.toMatch(ENGLISH)
    expect([...markup.matchAll(/aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)?<span[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(['Cocina'])
  })

  it('un proyecto en blanco invita a dibujar un ambiente y dice "Sin plantas" mientras no hay edificio', () => {
    const text = textOf(render(() => undefined))
    expect(text).toContain('Sin plantas')
    expect(text).toContain('Todavía no hay ambientes.')
  })

  it('en Ver los ambientes quedan deshabilitados', () => {
    const markup = render((fake) => {
      loft(fake)
      fake.scene.setState({ readOnly: true })
    })
    expect(markup.match(/<button[^>]*aria-pressed[^>]*disabled=""|<button[^>]*disabled=""[^>]*aria-pressed/g)).toHaveLength(2)
  })
})
