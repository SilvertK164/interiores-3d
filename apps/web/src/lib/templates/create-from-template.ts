import {
  type ProjectCreated,
  type ProjectKind,
  SCENE_MAX_BYTES,
  type SceneEnvelope,
  SceneEnvelopeSchema,
} from '@interiores/contract'
import type { ApiClient } from '../api/client'
import { templateById } from './index'
import { TemplateError } from './template-error'

export { TemplateError }

export type CreateFromTemplateResult = {
  project: ProjectCreated
  envelope: SceneEnvelope | null
  saved: boolean
  error?: unknown
}

/** Recorta el nombre; `null` si queda vacío (un nombre de solo espacios no debe llegar a la API). */
export function normalizeProjectName(raw: string): string | null {
  const name = raw.trim()
  return name.length > 0 ? name : null
}

async function loadTemplate(templateId: string, fetchImpl: typeof fetch): Promise<SceneEnvelope> {
  const info = templateById(templateId)
  if (!info) throw new TemplateError('No existe esa plantilla.')
  let response: Response
  try {
    response = await fetchImpl(info.file)
  } catch {
    throw new TemplateError('No pudimos cargar la plantilla. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (!response.ok) throw new TemplateError('No pudimos cargar la plantilla. Inténtalo de nuevo en unos segundos.')
  const text = await response.text()
  if (new TextEncoder().encode(text).length > SCENE_MAX_BYTES) throw new TemplateError('La plantilla supera el límite de 5 MB.')
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new TemplateError('La plantilla no tiene el formato esperado.')
  }
  const parsed = SceneEnvelopeSchema.safeParse(json)
  if (!parsed.success) throw new TemplateError('La plantilla no tiene el formato esperado.')
  return parsed.data
}

/**
 * Crea el proyecto y guarda la escena de la plantilla. La plantilla se pide y valida ANTES de crear el
 * proyecto: si no carga, no queda un proyecto vacío. Si falla el guardado, devuelve el proyecto y la escena
 * para reintentar sin crear otro.
 */
export async function createFromTemplate(
  api: Pick<ApiClient, 'createProject' | 'saveScene'>,
  input: { name: string; kind: ProjectKind; templateId: string | null },
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): Promise<CreateFromTemplateResult> {
  const envelope = input.templateId ? await loadTemplate(input.templateId, fetchImpl) : null
  const project = await api.createProject({ name: input.name, kind: input.kind })
  if (!envelope) return { project, envelope: null, saved: true }
  return retrySaveTemplate(api, { project, envelope, saved: false })
}

export async function retrySaveTemplate(
  api: Pick<ApiClient, 'saveScene'>,
  result: CreateFromTemplateResult,
): Promise<CreateFromTemplateResult> {
  if (!result.envelope) return { ...result, saved: true }
  try {
    await api.saveScene(result.project.id, result.envelope, 1)
    return { ...result, saved: true, error: undefined }
  } catch (error) {
    return { ...result, saved: false, error }
  }
}
