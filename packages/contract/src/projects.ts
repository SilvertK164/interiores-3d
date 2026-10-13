import { z } from 'zod'
import { SceneEnvelopeSchema } from './scene.js'

export const ProjectKindSchema = z.enum(['vivienda', 'comercio'])
/** 1 a 80 caracteres tras recortar y sin caracteres de control (saltos de línea, tabuladores…); la base lo repite con un check. */
export const ProjectNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[^\p{Cc}]+$/u, 'El nombre no puede tener saltos de línea ni caracteres de control')
/** Id de la plantilla de la que nació el proyecto; el mismo patrón que valida la columna `projects.template_id`. */
export const TemplateIdSchema = z.string().regex(/^[a-z0-9-]{1,40}$/)

export const CreateProjectBodySchema = z.object({
  name: ProjectNameSchema,
  kind: ProjectKindSchema.optional(),
  templateId: TemplateIdSchema.optional(),
})

export const UpdateProjectBodySchema = z
  .object({
    name: ProjectNameSchema.optional(),
    kind: ProjectKindSchema.nullable().optional(),
  })
  .refine((b) => b.name !== undefined || b.kind !== undefined, {
    message: 'Indica al menos un campo para actualizar',
  })

export const ProjectSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: ProjectKindSchema.nullable(),
  /** `null` para un proyecto en blanco o anterior a las plantillas. */
  templateId: TemplateIdSchema.nullable(),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const ProjectCreatedSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: ProjectKindSchema.nullable(),
  templateId: TemplateIdSchema.nullable(),
  version: z.literal(1),
})

export const ProjectDetailSchema = ProjectSummarySchema.extend({
  scene: SceneEnvelopeSchema,
  version: z.number().int().min(1),
})

export const SceneSavedSchema = z.object({ version: z.number().int().min(1) })

export type ProjectKind = z.infer<typeof ProjectKindSchema>
export type TemplateId = z.infer<typeof TemplateIdSchema>
export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>
export type ProjectCreated = z.infer<typeof ProjectCreatedSchema>
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>
export type SceneSaved = z.infer<typeof SceneSavedSchema>
