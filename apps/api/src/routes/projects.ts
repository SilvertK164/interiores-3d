import { CreateProjectBodySchema, UpdateProjectBodySchema } from '@interiores/contract'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { errors } from '../errors.js'
import type { Ctx, ProjectStore } from '../store.js'

const IdParams = z.object({ id: z.uuid() })

export function ctxOf(req: FastifyRequest): Ctx {
  return { userId: req.user.id, token: req.user.token }
}

/** Un id que no es uuid se trata como inexistente: 404, nunca un 500 del cast de Postgres. */
export function parseId(params: unknown): string {
  const parsed = IdParams.safeParse(params)
  if (!parsed.success) throw errors.notFound()
  return parsed.data.id
}

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join('.') || 'cuerpo'))]
    throw errors.invalid(`revisa ${fields.join(', ')}`)
  }
  return parsed.data
}

export const projectRoutes = (store: ProjectStore): FastifyPluginAsync => async (app) => {
  app.get('/projects', async (req) => store.list(ctxOf(req)))

  app.post('/projects', async (req, reply) => {
    const body = parseBody(CreateProjectBodySchema, req.body)
    const created = await store.create(ctxOf(req), body)
    return reply.status(201).send(created)
  })

  app.get('/projects/:id', async (req) => {
    const project = await store.get(ctxOf(req), parseId(req.params))
    if (!project) throw errors.notFound()
    return project
  })

  app.patch('/projects/:id', async (req) => {
    const id = parseId(req.params)
    const patch = parseBody(UpdateProjectBodySchema, req.body)
    const updated = await store.update(ctxOf(req), id, patch)
    if (!updated) throw errors.notFound()
    return updated
  })

  app.delete('/projects/:id', async (req, reply) => {
    const removed = await store.remove(ctxOf(req), parseId(req.params))
    if (!removed) throw errors.notFound()
    return reply.status(204).send()
  })
}
