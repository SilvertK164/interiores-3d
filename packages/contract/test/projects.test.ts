import { describe, expect, it } from 'vitest'
import {
  CreateProjectBodySchema,
  ProjectCreatedSchema,
  ProjectDetailSchema,
  ProjectSummarySchema,
  UpdateProjectBodySchema,
  emptyEnvelope,
} from '../src/index.js'

const ID = '0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'
const UPDATED_AT = '2026-10-11T12:00:00.000Z'

describe('CreateProjectBody', () => {
  it('recorta espacios del nombre', () => {
    expect(CreateProjectBodySchema.parse({ name: '  Casa Alvear  ' }).name).toBe('Casa Alvear')
  })

  it('rechaza nombre vacío o de más de 80 caracteres', () => {
    expect(CreateProjectBodySchema.safeParse({ name: '   ' }).success).toBe(false)
    expect(CreateProjectBodySchema.safeParse({ name: 'a'.repeat(81) }).success).toBe(false)
    expect(CreateProjectBodySchema.safeParse({ name: 'a'.repeat(80) }).success).toBe(true)
  })

  it('rechaza saltos de línea y otros caracteres de control dentro del nombre', () => {
    for (const bad of ['Casa\nAlvear', 'Casa\tAlvear', 'Casa\u0000Alvear', 'Casa\u007fAlvear', 'Casa\u0085Alvear']) {
      expect(CreateProjectBodySchema.safeParse({ name: bad }).success, JSON.stringify(bad)).toBe(false)
    }
    expect(CreateProjectBodySchema.safeParse({ name: 'Casa Alvear ñ 2' }).success).toBe(true)
  })

  it('solo admite vivienda o comercio como tipo', () => {
    expect(CreateProjectBodySchema.safeParse({ name: 'x', kind: 'oficina' }).success).toBe(false)
    expect(CreateProjectBodySchema.safeParse({ name: 'x', kind: 'comercio' }).success).toBe(true)
  })

  it('la plantilla de origen es opcional: sin templateId el cuerpo sigue siendo válido', () => {
    const parsed = CreateProjectBodySchema.safeParse({ name: 'En blanco', kind: 'vivienda' })
    expect(parsed.success).toBe(true)
    expect(parsed.data).not.toHaveProperty('templateId')
  })

  it.each(['concept-store', 'cafe', 'supermercado', 'loft', 'a', 'a'.repeat(40), 'tienda-2'])(
    'acepta el templateId %s',
    (templateId) => {
      expect(CreateProjectBodySchema.parse({ name: 'x', templateId }).templateId).toBe(templateId)
    },
  )

  it.each([
    ['vacío', ''],
    ['de más de 40 caracteres', 'a'.repeat(41)],
    ['con mayúsculas', 'Concept-Store'],
    ['con espacios', 'concept store'],
    ['con guion bajo', 'concept_store'],
    ['con tilde', 'cafetería'],
    ['con una barra', '../loft'],
    ['con salto de línea al final', 'loft\n'],
  ])('rechaza un templateId %s', (_motivo, templateId) => {
    expect(CreateProjectBodySchema.safeParse({ name: 'x', templateId }).success).toBe(false)
  })

  it('rechaza un templateId que no es texto', () => {
    expect(CreateProjectBodySchema.safeParse({ name: 'x', templateId: 7 }).success).toBe(false)
  })
})

describe('UpdateProjectBody', () => {
  it('exige al menos un campo', () => {
    expect(UpdateProjectBodySchema.safeParse({}).success).toBe(false)
    expect(UpdateProjectBodySchema.safeParse({ name: 'Nuevo' }).success).toBe(true)
  })

  it('permite quitar el tipo con null', () => {
    expect(UpdateProjectBodySchema.safeParse({ kind: null }).success).toBe(true)
  })

})

describe('plantilla de origen en las respuestas', () => {
  const summary = { id: ID, name: 'Casa', kind: null, updatedAt: UPDATED_AT }
  const created = { id: ID, name: 'Casa', kind: null, version: 1 }
  const detail = { ...summary, scene: emptyEnvelope(), version: 3 }

  it('ProjectSummary, ProjectCreated y ProjectDetail devuelven la plantilla de la que nació el proyecto', () => {
    expect(ProjectSummarySchema.parse({ ...summary, templateId: 'cafe' }).templateId).toBe('cafe')
    expect(ProjectCreatedSchema.parse({ ...created, templateId: 'loft' }).templateId).toBe('loft')
    expect(ProjectDetailSchema.parse({ ...detail, templateId: 'supermercado' }).templateId).toBe('supermercado')
  })

  it('un proyecto en blanco o anterior a las plantillas devuelve templateId null', () => {
    expect(ProjectSummarySchema.parse({ ...summary, templateId: null }).templateId).toBeNull()
    expect(ProjectCreatedSchema.parse({ ...created, templateId: null }).templateId).toBeNull()
    expect(ProjectDetailSchema.parse({ ...detail, templateId: null }).templateId).toBeNull()
  })

  it('la clave templateId siempre viaja en la respuesta (null cuando no hay plantilla)', () => {
    expect(ProjectSummarySchema.safeParse(summary).success).toBe(false)
    expect(ProjectCreatedSchema.safeParse(created).success).toBe(false)
    expect(ProjectDetailSchema.safeParse(detail).success).toBe(false)
  })

  it('rechaza un templateId con otro formato', () => {
    expect(ProjectSummarySchema.safeParse({ ...summary, templateId: 'Concept Store' }).success).toBe(false)
    expect(ProjectCreatedSchema.safeParse({ ...created, templateId: '' }).success).toBe(false)
    expect(ProjectDetailSchema.safeParse({ ...detail, templateId: 'a'.repeat(41) }).success).toBe(false)
  })
})
