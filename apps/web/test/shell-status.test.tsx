import { Share2 } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SaveChip, type SaveState, SoonButton } from '../src/editor/shell/ui/status'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const NO_EMOJI = /\p{Extended_Pictographic}/u

describe('SaveChip', () => {
  const LABELS: Record<SaveState, string> = {
    guardado: 'Guardado',
    guardando: 'Guardando…',
    'sin-cambios': 'Sin cambios',
    'sin-conexion': 'Sin conexión',
    conflicto: 'Conflicto con otra pestaña',
    'sin-guardar': 'Sin guardar',
  }

  it.each(Object.entries(LABELS))('el estado %s dice "%s", con color e ícono y no solo color', (state, label) => {
    const markup = renderToStaticMarkup(<SaveChip state={state as SaveState} />)
    expect(textOf(markup)).toBe(label)
    expect(markup).toContain('data-testid="save-status"')
    expect(markup).toContain('role="status"')
    if (state !== 'guardando') expect(markup).toContain('<svg')
    expect(markup).not.toMatch(NO_EMOJI)
  })
})

describe('SoonButton', () => {
  const markup = renderToStaticMarkup(<SoonButton icon={Share2} label="Compartir" />)

  it('es un botón deshabilitado con la insignia "Pronto" y su etiqueta', () => {
    expect(markup).toMatch(/<button[^>]*disabled/)
    expect(textOf(markup)).toBe('CompartirProntoLlega en una próxima versión')
    expect(markup).toContain('role="tooltip"')
  })

  it('su contenedor recibe el foco del teclado y apunta a la etiqueta (el botón deshabilitado no puede)', () => {
    const id = /aria-describedby="([^"]+)"/.exec(markup)?.[1]
    expect(id).toBeTruthy()
    expect(markup).toContain('tabindex="0"')
    expect(markup).toContain(`id="${id}"`)
  })
})
