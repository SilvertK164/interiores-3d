import {
  AnalysisCatalogSchema,
  AnalyzeRoomBodySchema,
  type CatalogOption,
  type CreateProjectBody,
  CreateProjectBodySchema,
  ERROR_CODES,
  ErrorBodySchema,
  type ProjectCreated,
  ProjectCreatedSchema,
  type ProjectDetail,
  ProjectDetailSchema,
  type ProjectSummary,
  ProjectSummarySchema,
  type RoomAnalysis,
  RoomAnalysisSchema,
  type SceneEnvelope,
  type SceneSaved,
  SceneSavedSchema,
  type UpdateProjectBody,
} from '@interiores/contract'
import { z } from 'zod'
import { type ReducedPhoto, reducePhoto } from './photo'

const KEEPALIVE_MAX_BYTES = 60_000
/** La API espera hasta 25 s a Gemini y la función de Vercel dura 30: si en 40 s no hubo respuesta, algo se colgó. */
const ANALYZE_TIMEOUT_MS = 40_000

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
  /** Cómo se reduce la foto antes de enviarla al análisis (por defecto, en el navegador con un canvas; las pruebas lo reemplazan). */
  preparePhoto?: (file: Blob) => Promise<ReducedPhoto>
}

export type AnalyzeRoomOptions = {
  /** Ancho conocido del ambiente en metros (mayor que 0 y hasta 100); sin él, el análisis responde sin calibrar. */
  knownWidthM?: number | null
  /** Las piezas del catálogo entre las que puede elegir el análisis (`buildAnalysisCatalog(...).candidates`). */
  catalog: readonly CatalogOption[]
}

const isTimeout = (error: unknown) => error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')

export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))

  async function request<T>(
    method: string,
    path: string,
    schema: z.ZodType<T> | null,
    extra: {
      body?: unknown
      /** Arma el cuerpo después de comprobar la sesión (para no trabajar de más sin ella). */
      makeBody?: () => Promise<unknown>
      headers?: Record<string, string>
      keepalive?: boolean
      timeoutMs?: number
    } = {},
  ): Promise<T> {
    const token = await opts.getToken()
    if (!token) throw new ApiError(401, 'no_autenticado', 'No hay sesión iniciada.')
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...extra.headers }
    const payload = extra.makeBody ? await extra.makeBody() : extra.body
    if (payload !== undefined) headers['Content-Type'] = 'application/json'
    const body = payload === undefined ? undefined : JSON.stringify(payload)
    const signal = extra.timeoutMs === undefined ? undefined : AbortSignal.timeout(extra.timeoutMs)
    // fetch con keepalive rechaza cuerpos de más de 64 KiB: por encima de este tope va como pedido normal.
    const keepalive = extra.keepalive === true && body !== undefined && new TextEncoder().encode(body).length <= KEEPALIVE_MAX_BYTES
    let res: Response
    try {
      res = await doFetch(`${opts.baseUrl}${path}`, { method, headers, body, ...(keepalive ? { keepalive: true } : {}), ...(signal ? { signal } : {}) })
    } catch (error) {
      if (signal?.aborted || isTimeout(error)) throw new ApiError(0, 'tiempo_agotado', 'El servidor tardó demasiado en responder.')
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
    saveScene: (id: string, scene: SceneEnvelope, version: number, saveOpts: { keepalive?: boolean } = {}): Promise<SceneSaved> =>
      request('PUT', `/v1/projects/${id}/scene`, SceneSavedSchema, {
        body: scene,
        headers: { 'If-Match': String(version) },
        keepalive: saveOpts.keepalive,
      }),
    /**
     * Pide qué muebles del catálogo hay en la foto de un ambiente. Lo que no depende de la red se revisa primero (la sesión, el
     * catálogo, el ancho) y recién entonces se reduce la foto en el navegador (lado mayor ≤ 1600 px, JPEG 0,85) y se envía como
     * JSON. Un problema con la foto sale como `PhotoError`; los de la API, como `ApiError`.
     */
    analyzeRoom: async (file: Blob, analyzeOpts: AnalyzeRoomOptions): Promise<RoomAnalysis> => {
      const checked = AnalyzeRoomBodySchema.pick({ catalog: true, knownWidthM: true }).safeParse({
        catalog: analyzeOpts.catalog,
        ...(analyzeOpts.knownWidthM != null ? { knownWidthM: analyzeOpts.knownWidthM } : {}),
      })
      if (!checked.success) {
        const invalidCatalog = AnalysisCatalogSchema.safeParse(analyzeOpts.catalog).success === false
        if (invalidCatalog) throw new ApiError(422, ERROR_CODES.invalidCatalog, 'El catálogo no es válido.')
        throw new ApiError(422, ERROR_CODES.invalid, 'Los datos enviados no son válidos: el ancho conocido debe ser mayor que 0 y de hasta 100 metros.')
      }
      const prepare = opts.preparePhoto ?? reducePhoto
      return request('POST', '/v1/analyze-room', RoomAnalysisSchema, {
        makeBody: async () => ({ ...(await prepare(file)), ...checked.data }),
        timeoutMs: ANALYZE_TIMEOUT_MS,
      })
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
