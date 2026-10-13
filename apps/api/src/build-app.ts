import cors from '@fastify/cors'
import { ERROR_CODES, SCENE_MAX_BYTES } from '@interiores/contract'
import Fastify, { type FastifyServerOptions } from 'fastify'
import { type AuthUser, type AuthVerifier, bearerToken } from './auth.js'
import { AppError, errorBody, errors } from './errors.js'
import { analyzeRoomRoutes } from './routes/analyze-room.js'
import { healthRoutes } from './routes/health.js'
import { projectRoutes } from './routes/projects.js'
import { sceneRoutes } from './routes/scene.js'
import type { ProjectStore } from './store.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
  interface FastifyContextConfig {
    /** `image`: si el cuerpo pasa el tope de la ruta, el error habla de la foto y no de la escena. */
    oversize?: 'image'
  }
}

export type Deps = { auth: AuthVerifier; store: ProjectStore; corsOrigins?: string[] }
export type BuildOptions = {
  logger?: FastifyServerOptions['logger']
  onRoute?: (route: { method: string; url: string }) => void
}

export const LOGGER_REDACT = ['req.headers.authorization', 'headers.authorization']

export function buildApp(deps: Deps, options: BuildOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: SCENE_MAX_BYTES })

  app.addHook('onRoute', (route) => {
    for (const method of [route.method].flat()) options.onRoute?.({ method, url: route.url })
  })

  // La API solo devuelve JSON: nada de enmarcarla, de adivinar tipos ni de guardar en caché respuestas con datos de una persona.
  app.addHook('onSend', async (_req, reply) => {
    reply.headers({
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-frame-options': 'DENY',
      'strict-transport-security': 'max-age=63072000; includeSubDomains',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    })
  })

  app.register(cors, {
    origin: deps.corsOrigins && deps.corsOrigins.length > 0 ? deps.corsOrigins : false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'If-Match'],
  })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) return reply.status(err.status).send(errorBody(err.code, err.message))
    const code = (err as { code?: string }).code
    if (code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      const e = req.routeOptions.config?.oversize === 'image' ? errors.imageTooLarge() : errors.tooLarge()
      return reply.status(e.status).send(errorBody(e.code, e.message))
    }
    const status = (err as { statusCode?: number }).statusCode
    if (status && status >= 400 && status < 500) {
      const e = errors.invalid('el cuerpo no es un JSON válido')
      return reply.status(e.status).send(errorBody(e.code, e.message))
    }
    req.log.error({ err }, 'error no controlado')
    const e = errors.internal()
    return reply.status(e.status).send(errorBody(e.code, e.message))
  })

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send(errorBody(ERROR_CODES.notFound, 'No encontramos esa dirección.')),
  )

  app.decorateRequest('user', undefined as unknown as AuthUser)
  app.register(healthRoutes)
  app.register(
    async (v1) => {
      v1.addHook('onRequest', async (req) => {
        const token = bearerToken(req.headers.authorization)
        const user = token ? await deps.auth(token) : null
        if (!user) throw errors.unauthorized()
        req.user = user
      })
      v1.register(projectRoutes(deps.store))
      v1.register(sceneRoutes(deps.store))
      v1.register(analyzeRoomRoutes)
    },
    { prefix: '/v1' },
  )

  return app
}
