import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { EditorShell } from '../src/editor/shell/EditorShell'
import { ShellView } from '../src/editor/shell/ShellView'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const NONE = { cameraControl: false, styleControl: false, walkthrough: false }
const pressed = (markup: string) =>
  [...markup.matchAll(/aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/g)].map((m) => m[1])

function render(node: React.ReactNode) {
  const fake = createFakeDeps()
  fake.viewer.setState({ wallMode: 'cutaway', levelMode: 'solo', shading: 'rendered' })
  return renderToStaticMarkup(<BridgeProvider bridge={createBridge(fake.deps)}>{node}</BridgeProvider>)
}

describe('ShellView', () => {
  const all = { cameraControl: true, styleControl: true, walkthrough: true }

  it('muestra el panel Vista 3D, la barra de cámara y Compartir y Renderizar deshabilitados con "Pronto"', () => {
    const markup = render(<ShellView decisions={all} />)
    const text = textOf(markup)
    expect(markup).toContain('aria-label="Vista 3D"')
    expect(markup).toContain('role="toolbar"')
    for (const word of ['Muros', 'Niveles', 'Cámara', 'Estilo', 'Girar izq.', 'Girar der.', 'Vista superior', 'Recorrer', 'Compartir', 'Renderizar']) {
      expect(text, word).toContain(word)
    }
    expect(markup.match(/Pronto/g)).toHaveLength(2)
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2)
  })

  it('marca lo que Pascal tiene: muros cortados, un solo nivel y estilo realista', () => {
    expect(pressed(render(<ShellView decisions={all} />))).toEqual(['Cortados', 'Uno solo', 'Perspectiva', 'Realista'])
  })

  it('sin Cámara, Estilo ni Recorrer del spike, esos controles no están', () => {
    const text = textOf(render(<ShellView decisions={NONE} />))
    for (const word of ['Cámara', 'Estilo', 'Perspectiva', 'Realista', 'Recorrer']) expect(text, word).not.toContain(word)
    expect(text).toContain('Girar izq.')
  })
})

describe('EditorShell según el modo', () => {
  const shell = (readOnly: boolean) => {
    const fake = createFakeDeps()
    fake.scene.setState({ readOnly })
    return renderToStaticMarkup(
      <EditorShell bridge={createBridge(fake.deps)} catalog={[]} projectName="Loft" saveStatus="saved" onBack={() => undefined} />,
    )
  }

  it('en Ver muestra la Vista 3D y no el dock; en Editar, al revés', () => {
    const view = shell(true)
    expect(view).toContain('aria-label="Vista 3D"')
    expect(view).not.toContain('aria-label="Herramientas de edición"')
    const edit = shell(false)
    expect(edit).toContain('aria-label="Herramientas de edición"')
    expect(edit).not.toContain('aria-label="Vista 3D"')
  })
})
