import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SHORTCUTS } from '../src/editor/shell/more-model'
import { ShortcutsDialog } from '../src/editor/shell/ui/ShortcutsDialog'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}

describe('ShortcutsDialog', () => {
  it('lista todos los atajos en castellano dentro de un diálogo con nombre', () => {
    const markup = renderToStaticMarkup(<ShortcutsDialog open={false} shortcuts={SHORTCUTS} onClose={noop} />)
    expect(markup).toContain('aria-label="Atajos de teclado"')
    expect(markup.match(/<dt/g)).toHaveLength(SHORTCUTS.length)
    expect(textOf(markup)).toContain('Borrar lo elegido')
    expect(markup).not.toMatch(NO_EMOJI)
  })
})
