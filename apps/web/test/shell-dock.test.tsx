import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { ShellDock } from '../src/editor/shell/ShellDock'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

function render(node: React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  return renderToStaticMarkup(<BridgeProvider bridge={createBridge(fake.deps)}>{node}</BridgeProvider>)
}
const pressedLabels = (markup: string) =>
  [...markup.matchAll(/aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/g)].map((m) => m[1])

describe('ShellDock', () => {
  it('muestra los siete botones y marca el que corresponde a la herramienta REAL de Pascal (un proyecto en blanco abre con Estructura)', () => {
    const markup = render(<ShellDock />)
    const toolbar = markup.slice(0, markup.indexOf('<dialog')) // el diálogo de atajos está cerrado y va después de la barra
    expect(textOf(toolbar)).toBe('SeleccionarEstructuraAberturasMueblesMaterialesMedirMás')
    expect(pressedLabels(markup)).toEqual(['Estructura'])
  })

  it('marca Seleccionar, Aberturas, Muebles, Materiales, Medir o Más según el modo y la herramienta restaurados', () => {
    const cases: [Parameters<ReturnType<typeof createFakeDeps>['editor']['setState']>[0], string][] = [
      [{ mode: 'select', tool: null }, 'Seleccionar'],
      [{ mode: 'build', tool: 'window' }, 'Aberturas'],
      [{ mode: 'build', tool: 'item' }, 'Muebles'],
      [{ mode: 'material-paint', tool: null }, 'Materiales'],
      [{ mode: 'build', tool: 'measurement' }, 'Medir'],
      [{ mode: 'delete', tool: null }, 'Más'],
    ]
    for (const [state, label] of cases) {
      expect(pressedLabels(render(<ShellDock />, ({ editor }) => editor.setState(state))), label).toEqual([label])
    }
  })

  it('no dibuja ningún menú ni diálogo abierto al montarse', () => {
    const markup = render(<ShellDock />)
    expect(markup).not.toContain('role="menu"')
    expect(markup).not.toContain('role="dialog"')
    expect(markup).not.toMatch(NO_EMOJI)
  })
})
