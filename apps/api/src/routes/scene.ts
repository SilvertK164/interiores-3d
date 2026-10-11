import { SceneEnvelopeSchema } from '@interiores/contract'
import type { FastifyPluginAsync } from 'fastify'
import { errors } from '../errors.js'
import type { ProjectStore } from '../store.js'
import { ctxOf, parseBody, parseId } from './projects.js'

/** Acepta `3`, `"3"` y `W/"3"`; todo lo demás (0, abc, -1, 1.5, vacío) es un 422. */
export function parseIfMatch(raw: string | string[]): number {
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? ''
  const cleaned = value.trim().replace(/^W\//, '').replace(/^"(.*)"$/, '$1')
  if (!/^[1-9]\d*$/.test(cleaned)) throw errors.invalid('If-Match debe ser el número de versión')
  return Number(cleaned)
}

export const sceneRoutes = (store: ProjectStore): FastifyPluginAsync => async (app) => {
  app.put('/projects/:id/scene', async (req) => {
    const id = parseId(req.params)
    const raw = req.headers['if-match']
    if (raw === undefined) throw errors.preconditionRequired()
    const expected = parseIfMatch(raw)
    const envelope = parseBody(SceneEnvelopeSchema, req.body)
    const result = await store.saveScene(ctxOf(req), id, envelope, expected)
    if (result.kind === 'not_found') throw errors.notFound()
    if (result.kind === 'conflict') throw errors.conflict()
    return { version: result.version }
  })
}
