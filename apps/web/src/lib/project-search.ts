import type { ProjectSummary } from '@interiores/contract'
import { TEMPLATES, type TemplateInfo, templateById } from './templates'
import { kindLabel } from './ui-text'

/** Minúsculas y sin tildes, para que "cafe" encuentre "Café". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const words = (query: string) => fold(query).split(/\s+/).filter(Boolean)

/** Todas las palabras de la búsqueda deben aparecer en alguno de los textos. */
function matches(query: string, haystack: string[]): boolean {
  const terms = words(query)
  if (terms.length === 0) return true
  const text = fold(haystack.join(' '))
  return terms.every((t) => text.includes(t))
}

/** Proyectos cuyo nombre, o el de su plantilla, contiene lo buscado. */
export function filterProjects(projects: ProjectSummary[], query: string): ProjectSummary[] {
  return projects.filter((p) => matches(query, [p.name, (p.templateId && templateById(p.templateId)?.name) || '']))
}

/** Plantillas cuyo nombre o tipo (vivienda, comercio) contiene lo buscado. */
export function filterTemplates(query: string): TemplateInfo[] {
  return TEMPLATES.filter((t) => matches(query, [t.name, kindLabel(t.kind)]))
}
