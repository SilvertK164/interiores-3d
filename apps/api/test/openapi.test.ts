import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ANALYSES_PER_HOUR,
  ANALYZE_CATALOG_MAX_ITEMS,
  ANALYZE_IMAGE_MAX_BASE64_CHARS,
  ANALYZE_MAX_FURNITURE,
  ANALYZE_MAX_OPENINGS,
  AnalyzeRoomBodySchema,
  CAMERA_FOV_MAX_DEG,
  CAMERA_FOV_MIN_DEG,
  CatalogOptionSchema,
  CreateProjectBodySchema,
  DetectedFurnitureSchema,
  ERROR_CODES,
  ErrorBodySchema,
  PhotoCameraSchema,
  ProjectCreatedSchema,
  ProjectDetailSchema,
  ProjectSummarySchema,
  ROOM_MAX_M,
  ROOM_MIN_M,
  RoomAnalysisSchema,
  RoomOpeningSchema,
  RoomSizeSchema,
  SceneEnvelopeSchema,
  SceneSavedSchema,
  TemplateIdSchema,
  UpdateProjectBodySchema,
  WALL_SIDES,
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
    expect(codes('/v1/analyze-room', 'post')).toEqual(['200', '401', '413', '422', '429', '502', '503'])
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
    ['AnalyzeRoomBody', AnalyzeRoomBodySchema],
    ['CatalogOption', CatalogOptionSchema],
    ['RoomAnalysis', RoomAnalysisSchema],
    ['DetectedFurniture', DetectedFurnitureSchema],
    ['RoomSize', RoomSizeSchema],
    ['PhotoCamera', PhotoCameraSchema],
    ['RoomOpening', RoomOpeningSchema],
  ]

  it.each(pairs)('%s coincide con su esquema zod (propiedades y obligatorias)', (name, schema) => {
    const fromZod = z.toJSONSchema(schema, { io: 'input' }) as { properties?: object; required?: string[] }
    const fromYaml = spec.components.schemas[name] as { properties?: object; required?: string[] }
    expect(Object.keys(fromYaml.properties ?? {}).sort()).toEqual(Object.keys(fromZod.properties ?? {}).sort())
    expect([...(fromYaml.required ?? [])].sort()).toEqual([...(fromZod.required ?? [])].sort())
  })

  it('ErrorBody enumera todos los códigos de error del contrato', () => {
    expect([...spec.components.schemas.ErrorBody.properties.error.properties.code.enum].sort()).toEqual(Object.values(ERROR_CODES).sort())
  })

  it('documenta el tope de proyectos y los límites de la base en las respuestas 422 y 413', () => {
    expect(spec.components.responses.ValidationError.description).toMatch(/limite_de_proyectos/)
    expect(spec.components.responses.TooLarge.description).toMatch(/4 MB/)
  })

  it('TemplateId usa el mismo patrón que TemplateIdSchema y que la columna template_id', () => {
    const fromZod = z.toJSONSchema(TemplateIdSchema) as { type?: string; pattern?: string }
    expect(fromZod.pattern).toBe('^[a-z0-9-]{1,40}$')
    expect(spec.components.schemas.TemplateId).toMatchObject({ type: 'string', pattern: fromZod.pattern })
  })

  it('templateId es anulable en las respuestas y, al crear, opcional y sin null', () => {
    const schemas = spec.components.schemas
    for (const name of ['ProjectSummary', 'ProjectCreated', 'ProjectDetail']) {
      expect(schemas[name].properties.templateId.oneOf, name).toEqual([{ $ref: '#/components/schemas/TemplateId' }, { type: 'null' }])
    }
    expect(schemas.CreateProjectBody.properties.templateId).toEqual({ $ref: '#/components/schemas/TemplateId' })
    expect(schemas.CreateProjectBody.required).toEqual(['name'])
  })

  it('POST /v1/analyze-room exige sesión (usa la seguridad global) y documenta los límites del contrato', () => {
    const post = spec.paths['/v1/analyze-room'].post
    expect(post.security).toBeUndefined()
    expect(spec.security).toEqual([{ bearerAuth: [] }])
    const body = spec.components.schemas.AnalyzeRoomBody
    expect(body.properties.image.maxLength).toBe(ANALYZE_IMAGE_MAX_BASE64_CHARS)
    expect(body.properties.mime.enum).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(body.properties.catalog.maxItems).toBe(ANALYZE_CATALOG_MAX_ITEMS)
    expect(body.properties.knownWidthM).toMatchObject({ exclusiveMinimum: 0, maximum: 100 })
    expect(spec.components.schemas.CatalogOption.additionalProperties).toBe(false)
  })

  it('la respuesta del análisis es el plano: ambiente, cámara, aberturas, muebles y avisos, sin la calibración anterior', () => {
    const { schemas } = spec.components
    expect(schemas.Calibration).toBeUndefined()
    expect(Object.keys(schemas.RoomAnalysis.properties)).toEqual(['room', 'camera', 'openings', 'furniture', 'warnings'])
    expect(schemas.RoomAnalysis.properties.furniture.maxItems).toBe(ANALYZE_MAX_FURNITURE)
    expect(schemas.RoomAnalysis.properties.openings.maxItems).toBe(ANALYZE_MAX_OPENINGS)
    expect(schemas.RoomSize.properties.width_m).toMatchObject({ minimum: ROOM_MIN_M, maximum: ROOM_MAX_M })
    expect(schemas.PhotoCamera.properties.fov_deg).toMatchObject({ minimum: CAMERA_FOV_MIN_DEG, maximum: CAMERA_FOV_MAX_DEG })
    expect(schemas.PhotoCamera.properties.look_at.required).toEqual(['x_m', 'z_m'])
    expect(schemas.RoomOpening.properties.wall.enum).toEqual([...WALL_SIDES])
    expect(schemas.DetectedFurniture.properties.against_wall.oneOf).toEqual([{ type: 'string', enum: [...WALL_SIDES] }, { type: 'null' }])
    expect(schemas.DetectedFurniture.properties.on_top_of.oneOf[1]).toEqual({ type: 'null' })
  })

  it('las piezas del catálogo pueden llevar sus medidas reales en metros: dimensions_m = [ancho, alto, fondo]', () => {
    expect(spec.components.schemas.CatalogOption.properties.dimensions_m).toMatchObject({ type: 'array', minItems: 3, maxItems: 3 })
    expect(spec.components.schemas.CatalogOption.required).not.toContain('dimensions_m')
  })

  it('las respuestas del análisis explican cada falla en castellano', () => {
    const { responses } = spec.components
    expect(responses.ImageTooLarge.description).toMatch(/3 MB/)
    expect(responses.AnalysisLimit.description).toMatch(new RegExp(`${ANALYSES_PER_HOUR} análisis por hora`))
    expect(responses.AnalysisFailed.description).toMatch(/proveedor/i)
    expect(responses.AnalysisUnavailable.description).toMatch(/GEMINI_API_KEY/)
  })
})
