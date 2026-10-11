import {
  type CreateProjectBody,
  CreateProjectBodySchema,
  ErrorBodySchema,
  type ProjectCreated,
  ProjectCreatedSchema,
  type ProjectDetail,
  ProjectDetailSchema,
  type ProjectSummary,
  ProjectSummarySchema,
  type SceneEnvelope,
  type SceneSaved,
  SceneSavedSchema,
  type UpdateProjectBody,
} from '@interiores/contract'
import { z } from 'zod'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export type ApiClientOptions = {
  baseUrl: string
  getToken: () => Promise<string | null>
  fetchImpl?: typeof fetch
}

export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))

  async function request<T>(
    method: string,
    path: string,
    schema: z.ZodType<T> | null,
    extra: { body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const token = await opts.getToken()
    if (!token) throw new ApiError(401, 'no_autenticado', 'No hay sesión iniciada.')
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...extra.headers }
    if (extra.body !== undefined) headers['Content-Type'] = 'application/json'
    let res: Response
    try {
      res = await doFetch(`${opts.baseUrl}${path}`, {
        method,
        headers,
        body: extra.body === undefined ? undefined : JSON.stringify(extra.body),
      })
    } catch {
      throw new ApiError(0, 'sin_conexion', 'No hay conexión con el servidor.')
    }
    if (!res.ok) {
      const parsed = ErrorBodySchema.safeParse(await res.json().catch(() => null))
      throw parsed.success
        ? new ApiError(res.status, parsed.data.error.code, parsed.data.error.message)
        : new ApiError(res.status, 'error_desconocido', `Error ${res.status}`)
    }
    if (res.status === 204 || schema === null) return undefined as T
    return schema.parse(await res.json())
  }

  return {
    listProjects: (): Promise<ProjectSummary[]> => request('GET', '/v1/projects', z.array(ProjectSummarySchema)),
    createProject: (body: CreateProjectBody): Promise<ProjectCreated> =>
      request('POST', '/v1/projects', ProjectCreatedSchema, { body: CreateProjectBodySchema.parse(body) }),
    getProject: (id: string): Promise<ProjectDetail> => request('GET', `/v1/projects/${id}`, ProjectDetailSchema),
    updateProject: (id: string, patch: UpdateProjectBody): Promise<ProjectSummary> =>
      request('PATCH', `/v1/projects/${id}`, ProjectSummarySchema, { body: patch }),
    deleteProject: (id: string): Promise<void> => request('DELETE', `/v1/projects/${id}`, null),
    saveScene: (id: string, scene: SceneEnvelope, version: number): Promise<SceneSaved> =>
      request('PUT', `/v1/projects/${id}/scene`, SceneSavedSchema, {
        body: scene,
        headers: { 'If-Match': String(version) },
      }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
