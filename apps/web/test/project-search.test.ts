import { describe, expect, it } from 'vitest'
import { filterProjects, filterTemplates } from '../src/lib/project-search'

const P = (name: string, templateId: string | null) => ({
  id: name,
  name,
  kind: templateId === 'loft' ? ('vivienda' as const) : ('comercio' as const),
  templateId,
  updatedAt: '2026-10-11T12:00:00.000Z',
})

const projects = [P('Tienda del centro', 'concept-store'), P('Mi casa', 'loft'), P('Local nuevo', null)]

describe('filterProjects', () => {
  it('sin texto devuelve todos', () => {
    expect(filterProjects(projects, '')).toEqual(projects)
    expect(filterProjects(projects, '   ')).toEqual(projects)
  })
  it('filtra por nombre del proyecto sin distinguir mayúsculas ni tildes', () => {
    expect(filterProjects(projects, 'CASA').map((p) => p.name)).toEqual(['Mi casa'])
    expect(filterProjects(projects, 'tienda').map((p) => p.name)).toEqual(['Tienda del centro'])
  })
  it('filtra por el nombre de la plantilla de la que nació', () => {
    expect(filterProjects(projects, 'loft').map((p) => p.name)).toEqual(['Mi casa'])
    expect(filterProjects(projects, 'concept').map((p) => p.name)).toEqual(['Tienda del centro'])
  })
  it('un proyecto en blanco solo coincide por su nombre', () => {
    expect(filterProjects(projects, 'nuevo').map((p) => p.name)).toEqual(['Local nuevo'])
  })
  it('todas las palabras deben aparecer', () => {
    expect(filterProjects(projects, 'tienda concept').map((p) => p.name)).toEqual(['Tienda del centro'])
    expect(filterProjects(projects, 'tienda loft')).toEqual([])
  })
})

describe('filterTemplates', () => {
  it('filtra por el nombre y por el tipo de la plantilla', () => {
    expect(filterTemplates('cafe').map((t) => t.id)).toEqual(['cafe'])
    expect(filterTemplates('café').map((t) => t.id)).toEqual(['cafe'])
    expect(filterTemplates('vivienda').map((t) => t.id)).toEqual(['loft'])
    expect(filterTemplates('zzz')).toEqual([])
  })
  it('sin texto devuelve todas', () => {
    expect(filterTemplates('').length).toBeGreaterThanOrEqual(4)
  })
})
