import type { ProjectKind } from '@interiores/contract'
import { templateById, templatesForKind } from './templates'

/** Tipo con el que abre el diálogo "Nuevo proyecto" si nadie eligió otro. */
export const DEFAULT_KIND: ProjectKind = 'comercio'

/** Primera plantilla de un tipo: la que queda marcada al elegir ese tipo. */
export const firstTemplateOf = (kind: ProjectKind): string | null => templatesForKind(kind)[0]?.id ?? null

/**
 * Cómo abre el diálogo "Nuevo proyecto": con una plantilla del mosaico elegida, con un tipo marcado
 * (desde `/bienvenida`) o con "En blanco". Sin preajuste abre como siempre.
 */
export type NewProjectPreset = { templateId: string } | { kind: ProjectKind } | { blank: true }

/** Lee `?nuevo=vivienda|comercio|blanco` de la URL de /proyectos; cualquier otra cosa no abre nada. */
export function parseNewProjectParam(search: string): NewProjectPreset | null {
  const value = new URLSearchParams(search).get('nuevo')
  if (value === 'vivienda' || value === 'comercio') return { kind: value }
  return value === 'blanco' ? { blank: true } : null
}

/** Tipo y plantilla con que arranca el formulario del diálogo para un preajuste. */
export function presetInitialState(preset?: NewProjectPreset | null): { kind: ProjectKind; templateId: string | null } {
  if (preset && 'blank' in preset) return { kind: DEFAULT_KIND, templateId: null }
  if (preset && 'kind' in preset) return { kind: preset.kind, templateId: firstTemplateOf(preset.kind) }
  const template = preset ? templateById(preset.templateId) : undefined
  const kind = template?.kind ?? DEFAULT_KIND
  return { kind, templateId: template?.id ?? firstTemplateOf(kind) }
}
