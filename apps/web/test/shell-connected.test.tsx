import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { EditorShell } from '../src/editor/shell/EditorShell'
import { ModeSwitch } from '../src/editor/shell/ModeSwitch'
import { ShellUndoRedo } from '../src/editor/shell/ShellUndoRedo'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { ViewSwitch } from '../src/editor/shell/ViewSwitch'
import { createFakeDeps } from './support/fake-deps'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}
const pressedOf = (markup: string) => [...markup.matchAll(/aria-pressed="(true|false)"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/g)].map((m) => [m[2], m[1]])

function render(node: (bridge: ReturnType<typeof createBridge>) => React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  const bridge = createBridge(fake.deps)
  return renderToStaticMarkup(<BridgeProvider bridge={bridge}>{node(bridge)}</BridgeProvider>)
}

describe('ModeSwitch', () => {
  it('marca Editar al abrir y Ver cuando la escena está en solo lectura', () => {
    expect(pressedOf(render(() => <ModeSwitch />))).toEqual([['Ver', 'false'], ['Editar', 'true']])
    expect(pressedOf(render(() => <ModeSwitch />, ({ scene }) => scene.setState({ readOnly: true })))).toEqual([['Ver', 'true'], ['Editar', 'false']])
  })
})

describe('ViewSwitch', () => {
  it('ofrece 2D, 3D y Ambas y marca la vista real de Pascal (Ambas = split)', () => {
    expect(pressedOf(render(() => <ViewSwitch />))).toEqual([['2D', 'false'], ['3D', 'true'], ['Ambas', 'false']])
    expect(pressedOf(render(() => <ViewSwitch />, ({ editor }) => editor.setState({ viewMode: 'split' })))).toEqual([['2D', 'false'], ['3D', 'false'], ['Ambas', 'true']])
  })
})

describe('ShellUndoRedo', () => {
  it('sin cambios ambos botones están deshabilitados; con algo que deshacer, solo Rehacer', () => {
    expect(render(() => <ShellUndoRedo />).match(/disabled=""/g)).toHaveLength(2)
    const withUndo = render(() => <ShellUndoRedo />, ({ history }) => history.set({ canUndo: true, canRedo: false }))
    expect(withUndo.match(/disabled=""/g)).toHaveLength(1)
  })
})

describe('EditorShell', () => {
  const shell = (setup?: Parameters<typeof render>[1], status: 'saved' | 'idle' = 'saved') =>
    render(
      (bridge) => <EditorShell bridge={bridge} catalog={[]} projectName="Loft Palermo" saveStatus={status} onBack={noop} />,
      setup,
    )

  it('es un contenedor que deja pasar los clics, por debajo de los diálogos de Pascal, con la barra superior', () => {
    const markup = shell()
    expect(markup).toContain('data-editor-shell')
    expect(markup).toContain('pointer-events-none')
    expect(markup).toContain('z-40')
    expect(markup).toMatch(/<h1[^>]*>Loft Palermo<\/h1>/)
    expect(textOf(markup)).toContain('Guardado')
  })

  it('en Editar muestra deshacer y rehacer; en Ver no', () => {
    expect(shell()).toContain('aria-label="Deshacer"')
    expect(shell(({ scene }) => scene.setState({ readOnly: true }))).not.toContain('aria-label="Deshacer"')
  })

  it('el chip refleja el estado del guardador y no usa emojis', () => {
    expect(textOf(shell(undefined, 'idle'))).toContain('Sin cambios')
    expect(shell()).not.toMatch(NO_EMOJI)
  })
})
