import { cafe } from './definitions/cafe'
import { conceptStore } from './definitions/concept-store'
import { loft } from './definitions/loft'
import { supermercado } from './definitions/supermercado'
import { definitionArea } from './geometry'
import type { TemplateDefinition } from './types'

export const TEMPLATE_DEFINITIONS: readonly TemplateDefinition[] = [conceptStore, cafe, supermercado, loft]

export type TemplateInfo = {
  id: string
  kind: TemplateDefinition['kind']
  name: string
  summary: string
  areaM2: number
  levels: number
  thumbnail: string
  file: string
}

export const TEMPLATES: TemplateInfo[] = TEMPLATE_DEFINITIONS.map((d) => ({
  id: d.id,
  kind: d.kind,
  name: d.name,
  summary: d.summary,
  areaM2: definitionArea(d),
  levels: d.levels.length,
  thumbnail: `/templates/${d.id}.jpg`,
  file: `/templates/${d.id}.json`,
}))

export const templatesForKind = (kind: TemplateDefinition['kind']): TemplateInfo[] => TEMPLATES.filter((t) => t.kind === kind)
export const templateById = (id: string): TemplateInfo | undefined => TEMPLATES.find((t) => t.id === id)
