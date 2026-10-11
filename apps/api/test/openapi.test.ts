import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CreateProjectBodySchema,
  ErrorBodySchema,
  ProjectCreatedSchema,
  ProjectDetailSchema,
  ProjectSummarySchema,
  SceneEnvelopeSchema,
  SceneSavedSchema,
  UpdateProjectBodySchema,
} from '@interiores/contract'
import { Validator } from '@seriousme/openapi-schema-validator'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { z } from 'zod'

// biome-ignore lint/suspicious/noExplicitAny: el yaml se recorre dinámicamente
const spec = parse(readFileSync(fileURLToPath(new URL('../openapi.yaml', import.meta.url)), 'utf8')) as Record<string, any>

describe('openapi.yaml', () => {
  it('es un documento OpenAPI 3.1 válido', async () => {
    const result = await new Validator().validate(spec)
    expect(result.valid, JSON.stringify(result.errors)).toBe(true)
    expect(spec.openapi).toBe('3.1.0')
  })

  it('declara las rutas del spec con sus códigos de respuesta', () => {
    const codes = (path: string, method: string) =>
      Object.keys(spec.paths[path][method].responses).sort()
    expect(codes('/v1/projects', 'get')).toEqual(['200', '401'])
    expect(codes('/v1/projects', 'post')).toEqual(['201', '401', '422'])
    expect(codes('/v1/projects/{id}', 'get')).toEqual(['200', '401', '404'])
    expect(codes('/v1/projects/{id}', 'patch')).toEqual(['200', '401', '404', '422'])
    expect(codes('/v1/projects/{id}', 'delete')).toEqual(['204', '401', '404'])
    expect(codes('/v1/projects/{id}/scene', 'put')).toEqual(['200', '401', '404', '409', '413', '422', '428'])
    expect(spec.paths['/health'].get.security).toEqual([])
  })

  const pairs: [string, z.ZodType][] = [
    ['CreateProjectBody', CreateProjectBodySchema],
    ['UpdateProjectBody', UpdateProjectBodySchema],
    ['ProjectSummary', ProjectSummarySchema],
    ['ProjectCreated', ProjectCreatedSchema],
    ['ProjectDetail', ProjectDetailSchema],
    ['SceneEnvelope', SceneEnvelopeSchema],
    ['SceneSaved', SceneSavedSchema],
    ['ErrorBody', ErrorBodySchema],
  ]

  it.each(pairs)('%s coincide con su esquema zod (propiedades y obligatorias)', (name, schema) => {
    const fromZod = z.toJSONSchema(schema, { io: 'input' }) as { properties?: object; required?: string[] }
    const fromYaml = spec.components.schemas[name] as { properties?: object; required?: string[] }
    expect(Object.keys(fromYaml.properties ?? {}).sort()).toEqual(Object.keys(fromZod.properties ?? {}).sort())
    expect([...(fromYaml.required ?? [])].sort()).toEqual([...(fromZod.required ?? [])].sort())
  })
})
