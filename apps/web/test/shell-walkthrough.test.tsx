import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { EditorShell } from '../src/editor/shell/EditorShell'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { WalkthroughHint } from '../src/editor/shell/WalkthroughHint'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('WalkthroughHint', () => {
  it('dice cómo volver y ofrece el botón Salir', () => {
    const markup = renderToStaticMarkup(
      <BridgeProvider bridge={createBridge(createFakeDeps().deps)}>
        <WalkthroughHint />
      </BridgeProvider>,
    )
    expect(textOf(markup)).toBe('Recorriendo el proyecto. Muévete con W A S D, mira con el ratón y pulsa Esc para volver.Salir')
    expect(markup).toContain('role="status"')
  })
})

describe('EditorShell mientras se recorre', () => {
  const shell = (firstPerson: boolean) => {
    const fake = createFakeDeps()
    fake.scene.setState({ readOnly: true })
    fake.editor.setState({ isFirstPersonMode: firstPerson })
    return renderToStaticMarkup(
      <EditorShell bridge={createBridge(fake.deps)} catalog={[]} projectName="Loft" saveStatus="saved" onBack={() => undefined} />,
    )
  }

  it('solo queda la barra superior y el aviso: ni plantas, ni Vista 3D, ni barra de cámara', () => {
    const walking = shell(true)
    expect(textOf(walking)).toContain('Recorriendo el proyecto')
    for (const label of ['Nivel y ambientes', 'Vista 3D', 'Cámara']) expect(walking, label).not.toContain(`aria-label="${label}"`)
    expect(walking).toMatch(/<h1[^>]*>Loft<\/h1>/)
  })

  it('al terminar el recorrido vuelven el panel y la barra', () => {
    const idle = shell(false)
    expect(idle).not.toContain('Recorriendo el proyecto')
    expect(idle).toContain('aria-label="Vista 3D"')
    expect(idle).toContain('aria-label="Nivel y ambientes"')
  })
})
