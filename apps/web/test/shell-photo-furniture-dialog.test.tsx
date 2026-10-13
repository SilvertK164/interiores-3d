import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { PhotoFurnitureDialog } from '../src/editor/shell/PhotoFurnitureDialog'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const CATALOG = [
  { id: 'sofa', name: 'Sofa' },
  { id: 'dining-chair', name: 'Dining chair' },
]

function render(open = false) {
  const fake = createFakeDeps()
  return renderToStaticMarkup(
    <BridgeProvider bridge={createBridge(fake.deps)}>
      <PhotoFurnitureDialog catalog={CATALOG} onClose={() => {}} open={open} opener={createRef<HTMLElement>()} />
    </BridgeProvider>,
  )
}

describe('diálogo "Muebles desde una foto"', () => {
  const markup = render()

  it('es un <dialog> con nombre y descripción, cerrado al montarse', () => {
    expect(markup).toMatch(/^<dialog/)
    expect(markup).not.toMatch(/<dialog[^>]*\sopen/)
    const labelled = /aria-labelledby="([^"]+)"/.exec(markup)?.[1]
    expect(markup).toMatch(new RegExp(`<h2[^>]*id="${labelled}"[^>]*>Muebles desde una foto</h2>`))
    const described = /aria-describedby="([^"]+)"/.exec(markup)?.[1]
    expect(markup).toMatch(new RegExp(`<p[^>]*id="${described}"[^>]*>[^<]*foto de un ambiente`))
  })

  it('recibe clics aunque el shell los deje pasar y no pide desplazarse: ancho acotado y sin alto fijo', () => {
    expect(markup).toContain('pointer-events-auto')
    expect(markup).toContain('app-dialog')
    expect(markup).toMatch(/max-w-\[\d+px\]/)
  })

  it('el botón de cerrar solo tiene ícono y por eso lleva nombre; todos los íconos son decorativos', () => {
    expect(markup).toMatch(/<button[^>]*aria-label="Cerrar"[^>]*type="button"|<button[^>]*type="button"[^>]*aria-label="Cerrar"/)
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toContain('aria-hidden="true"')
  })

  it('pide la foto (JPG, PNG o WebP) y el ancho opcional, cada campo con su etiqueta, y ya no pide ninguna dirección de servicio', () => {
    const text = textOf(markup)
    expect(text).toContain('Foto del ambiente (JPG, PNG o WebP)')
    expect(text).toContain('Ancho del ambiente, en metros (opcional)')
    expect(text).not.toMatch(/TP3|servicio|localhost|8000|Dirección/)
    expect(markup).toMatch(/<input[^>]*accept="image\/jpeg,image\/png,image\/webp"[^>]*type="file"|<input[^>]*type="file"[^>]*accept="image\/jpeg,image\/png,image\/webp"/)
    expect(markup).toMatch(/<input[^>]*inputMode="decimal"/)
    expect(markup).not.toMatch(/<input[^>]*inputMode="url"/)
    // cada campo está dentro de su <label>
    expect(markup.match(/<label/g)?.length).toBe(2)
  })

  it('muestra el aviso de privacidad: la foto viaja a Google (Gemini), no se guarda y Google puede usarla para mejorar sus productos', () => {
    const text = textOf(markup)
    expect(text).toMatch(/Google \(Gemini\)/)
    expect(text).toMatch(/no la guardamos/)
    expect(text).toMatch(/Google puede usar las fotos para mejorar sus productos/)
    expect(text).toMatch(/evita las privadas/)
  })

  it('dice cuántos análisis se pueden pedir por hora', () => {
    expect(textOf(markup)).toContain('Puedes analizar hasta 10 fotos por hora.')
  })

  it('empieza en el formulario: «Analizar foto» está deshabilitado hasta elegir la foto y «Agregar al proyecto» todavía no aparece', () => {
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Analizar foto/)
    expect(textOf(markup)).not.toContain('Agregar al proyecto')
  })

  it('no trae emojis ni palabras en inglés', () => {
    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(textOf(markup)).not.toMatch(/\b(Analyze|Upload|Photo|Add to project|Furniture|Close|Cancel)\b/)
  })
})
