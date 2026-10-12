import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { ExportPlanDialog } from '../src/editor/shell/ExportPlanDialog'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

function render(open = false) {
  const fake = createFakeDeps()
  return renderToStaticMarkup(
    <BridgeProvider bridge={createBridge(fake.deps)}>
      <ExportPlanDialog author="Silvert Quispe" onClose={() => {}} open={open} opener={createRef<HTMLElement>()} projectName="Casa Alvear" />
    </BridgeProvider>,
  )
}

describe('diálogo "Exportar plano" (criterio 15)', () => {
  const markup = render()

  it('es un <dialog> con nombre y descripción, cerrado al montarse', () => {
    expect(markup).toMatch(/^<dialog/)
    expect(markup).not.toMatch(/<dialog[^>]*\sopen/)
    const labelled = /aria-labelledby="([^"]+)"/.exec(markup)?.[1]
    expect(markup).toMatch(new RegExp(`<h2[^>]*id="${labelled}"[^>]*>Exportar plano</h2>`))
    expect(markup).toMatch(/aria-describedby="[^"]+"/)
    expect(textOf(markup)).toContain('PDF con escala, cotas y cajetín listo para imprimir.')
  })

  it('recibe clics aunque el shell los deje pasar, y ocupa el alto en pantallas angostas', () => {
    expect(markup).toContain('pointer-events-auto')
    expect(markup).toContain('app-dialog')
    expect(markup).toContain('max-[820px]:h-[calc(100dvh-2rem)]')
  })

  it('el botón de cerrar solo tiene ícono y por eso lleva nombre', () => {
    expect(markup).toMatch(/<button[^>]*aria-label="Cerrar"[^>]*type="button"|<button[^>]*type="button"[^>]*aria-label="Cerrar"/)
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toContain('aria-hidden="true"')
  })

  it('antes de medir muestra el cargador y "Descargar PDF" está deshabilitado; "Cancelar" no', () => {
    expect(textOf(markup)).toContain('Midiendo tu proyecto…')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Descargar PDF/)
    expect(markup).not.toMatch(/<button[^>]*disabled=""[^>]*>\s*Cancelar/)
    expect(markup).toContain('Cancelar')
  })

  it('no trae emojis ni palabras en inglés', () => {
    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(textOf(markup)).not.toMatch(/\b(Download|Cancel|Export|Floor plan|Sheet|Scale)\b/)
  })
})
