import type { ProjectSummary } from '@interiores/contract'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DeleteProjectDialog } from '../src/components/DeleteProjectDialog'
import { FlashNotice } from '../src/components/FlashNotice'
import { ProjectCard } from '../src/components/ProjectCard'
import { ProjectMenuPanel } from '../src/components/ProjectCardMenu'

const project: ProjectSummary = {
  id: '0b5c0c3e-5d7e-4c1d-9a3a-1b2c3d4e5f60',
  name: 'Casa de Ana',
  kind: 'vivienda',
  templateId: null,
  updatedAt: '2026-10-13T10:00:00.000Z',
}
const textOf = (markup: string) => markup.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')

describe('ProjectCard: el menú «…» es un botón real y hermano del enlace', () => {
  const markup = renderToStaticMarkup(<ProjectCard now={new Date('2026-10-13T12:00:00Z')} onDelete={() => {}} project={project} />)
  const link = markup.match(/<a[\s\S]*?<\/a>/)?.[0] ?? ''
  const button = markup.match(/<button[^>]*>/)?.[0] ?? ''

  it('la tarjeta sigue siendo un enlace al proyecto', () => {
    expect(link).toContain(`href="/proyectos/${project.id}"`)
    expect(textOf(link)).toContain('Casa de Ana')
  })

  it('el botón nombra el proyecto, anuncia un menú cerrado y NO va dentro del enlace', () => {
    expect(button).toContain('aria-label="Más opciones del proyecto Casa de Ana"')
    expect(button).toContain('aria-haspopup="menu"')
    expect(button).toContain('aria-expanded="false"')
    expect(button).toContain('type="button"')
    expect(link).not.toContain('<button')
    expect(markup.indexOf('<button')).toBeGreaterThan(markup.indexOf('</a>'))
  })

  it('cerrado no pinta el menú, y los íconos son decorativos', () => {
    expect(markup).not.toContain('role="menu"')
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toContain('aria-hidden="true"')
  })

  it('el botón se ve de 32 px pero extiende su área de toque a 44 px', () => {
    expect(button).toContain('size-8')
    expect(button).toContain('before:-inset-1.5')
  })
})

describe('ProjectMenuPanel', () => {
  const markup = renderToStaticMarkup(<ProjectMenuPanel id="m1" labelledBy="b1" onDelete={() => {}} />)
  it('es un menú con «Eliminar proyecto» en color de peligro y con un ícono decorativo', () => {
    expect(markup).toContain('role="menu"')
    expect(markup).toContain('aria-labelledby="b1"')
    expect(markup).toContain('role="menuitem"')
    expect(textOf(markup)).toBe('Eliminar proyecto')
    expect(markup).toContain('text-danger')
    expect(markup).toMatch(/<svg[^>]*aria-hidden="true"/)
  })
  it('el ítem mide al menos 44 px de alto', () => {
    expect(markup).toContain('h-11')
  })
})

describe('DeleteProjectDialog', () => {
  const markup = renderToStaticMarkup(<DeleteProjectDialog onClose={() => {}} onDeleted={() => {}} project={project} />)
  it('es un <dialog> app-dialog con título y la pregunta enlazados', () => {
    expect(markup).toMatch(/<dialog[^>]*class="[^"]*app-dialog/)
    const labelledby = markup.match(/<dialog[^>]*aria-labelledby="([^"]+)"/)?.[1]
    const describedby = markup.match(/<dialog[^>]*aria-describedby="([^"]+)"/)?.[1]
    expect(labelledby).toBeTruthy()
    expect(describedby).toBeTruthy()
    expect(markup).toContain(`id="${labelledby}"`)
    expect(markup).toContain(`id="${describedby}"`)
    expect(textOf(markup)).toContain('¿Eliminar «Casa de Ana»? Se borra con todo lo que tiene dentro y no se puede deshacer.')
  })
  it('ofrece «Cancelar» y un «Eliminar» destructivo, sin estar ocupado', () => {
    expect(markup).toMatch(/<button[^>]*>Cancelar<\/button>/)
    const remove = markup.match(/<button[^>]*btn-danger[^>]*>/)?.[0] ?? ''
    expect(remove).not.toBe('')
    expect(remove).not.toContain('aria-busy')
    expect(markup).toMatch(/btn-danger[^>]*>[^<]*Eliminar<\/button>/)
  })
  it('sin proyecto no escribe ningún nombre ni error', () => {
    const empty = renderToStaticMarkup(<DeleteProjectDialog onClose={() => {}} onDeleted={() => {}} project={null} />)
    expect(textOf(empty)).not.toContain('«')
    expect(empty).not.toContain('role="alert"')
  })
})

describe('FlashNotice', () => {
  it('la región viva existe aunque no haya mensaje', () => {
    const empty = renderToStaticMarkup(<FlashNotice message={null} onDone={() => {}} />)
    expect(empty).toContain('role="status"')
    expect(textOf(empty)).toBe('')
  })
  it('con mensaje lo muestra como texto, con un ícono decorativo', () => {
    const out = renderToStaticMarkup(<FlashNotice message="Proyecto eliminado" onDone={() => {}} />)
    expect(textOf(out)).toBe('Proyecto eliminado')
    expect(out).toMatch(/<svg[^>]*aria-hidden="true"/)
  })
})
