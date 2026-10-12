import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { BridgeProvider, useShell } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

function render(node: (bridge: ReturnType<typeof createBridge>) => React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  const bridge = createBridge(fake.deps)
  return renderToStaticMarkup(<BridgeProvider bridge={bridge}>{node(bridge)}</BridgeProvider>)
}

describe('useShell', () => {
  it('lee del estado real del puente y falla con un mensaje claro sin proveedor', () => {
    const Probe = () => <p>{useShell((s) => s.editor.viewMode)}</p>
    expect(render(() => <Probe />, ({ editor }) => editor.setState({ viewMode: 'split' }))).toBe('<p>split</p>')
    expect(() => renderToStaticMarkup(<Probe />)).toThrow('Falta <BridgeProvider>')
  })
})
