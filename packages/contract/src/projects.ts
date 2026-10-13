import { z } from 'zod'
import { SceneEnvelopeSchema } from './scene.js'

export const ProjectKindSchema = z.enum(['vivienda', 'comercio'])
export const ProjectNameSchema = z.string().trim().min(1).max(80)

export const CreateProjectBodySchema = z.object({
  name: ProjectNameSchema,
  kind: ProjectKindSchema.optional(),
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
  updatedAt: z.iso.datetime({ offset: true }),
})

export const ProjectCreatedSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: ProjectKindSchema.nullable(),
  version: z.literal(1),
})

export const ProjectDetailSchema = ProjectSummarySchema.extend({
  scene: SceneEnvelopeSchema,
  version: z.number().int().min(1),
})

export const SceneSavedSchema = z.object({ version: z.number().int().min(1) })

export type ProjectKind = z.infer<typeof ProjectKindSchema>
export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>
export type ProjectCreated = z.infer<typeof ProjectCreatedSchema>
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>
export type SceneSaved = z.infer<typeof SceneSavedSchema>
