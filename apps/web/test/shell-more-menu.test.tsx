import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { MoreMenu } from '../src/editor/shell/MoreMenu'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}

function render(node: React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  return renderToStaticMarkup(<BridgeProvider bridge={createBridge(fake.deps)}>{node}</BridgeProvider>)
}
const pressedLabels = (markup: string) =>
  [...markup.matchAll(/aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/g)].map((m) => m[1])

describe('MoreMenu', () => {
  const markup = render(<MoreMenu onClose={noop} onExportPlan={noop} onPhotoFurniture={noop} onShortcuts={noop} />)

  it('ofrece eliminar, cuadrícula, ajustes, Muebles desde una foto, atajos y Exportar plano, y nada más: sin Compartir, Renderizar ni "Pronto"', () => {
    const text = textOf(markup)
    for (const label of ['Eliminar elementos', 'Cuadrícula', 'Ajuste de muros', 'Ajuste de muebles', 'Muebles desde una foto', 'Atajos de teclado', 'Exportar plano']) {
      expect(text, label).toContain(label)
    }
    for (const gone of ['Compartir', 'Renderizar', 'Próximamente', 'Pronto']) expect(text, gone).not.toContain(gone)
    expect(markup.match(/<button[^>]*disabled=""/g)).toBeNull()
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-label="Más opciones"')
  })

  it('Exportar plano es un botón activo (sin "Pronto") con su ícono decorativo', () => {
    const buttons = markup.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Exportar plano<\/button>/g) ?? []
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).not.toContain('disabled')
    expect(buttons[0]).not.toContain('Pronto')
    expect(buttons[0]).toMatch(/<svg[^>]*aria-hidden="true"/)
  })

  it('Muebles desde una foto es un botón activo con su ícono decorativo', () => {
    const buttons = markup.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Muebles desde una foto<\/button>/g) ?? []
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).not.toContain('disabled')
    expect(buttons[0]).toMatch(/<svg[^>]*aria-hidden="true"/)
    expect(buttons[0]).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('marca la cuadrícula y los ajustes que tiene Pascal ahora (0,5 m; muros en cuadrícula; muebles en alineación)', () => {
    expect(pressedLabels(markup)).toEqual(['50 cm', 'Cuadrícula', 'Alineación'])
  })

  it('refleja otros valores de Pascal', () => {
    const other = render(<MoreMenu onClose={noop} onExportPlan={noop} onPhotoFurniture={noop} onShortcuts={noop} />, ({ editor }) =>
      editor.setState({ gridSnapStep: 0.1, snappingModeByContext: { wall: 'angles', item: 'off', polygon: 'grid', rotation: 'angles' }, mode: 'delete' }),
    )
    expect(pressedLabels(other)).toEqual(['Eliminar elementos', '10 cm', 'Ángulos', 'Libre'])
  })
})
