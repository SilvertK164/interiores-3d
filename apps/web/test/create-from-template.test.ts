import { emptyEnvelope } from '@interiores/contract'
import { type Mock, describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../src/lib/api/client'
import {
  TemplateError,
  createFromTemplate,
  normalizeProjectName,
  retrySaveTemplate,
} from '../src/lib/templates/create-from-template'

const ID = '0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'
const created = { id: ID, name: 'Mi tienda', kind: 'comercio' as const, version: 1 as const }
const envelope = { ...emptyEnvelope(), graph: { nodes: { a: { type: 'wall' } }, rootNodeIds: ['a'] } }

const okFetch = () => vi.fn(async () => new Response(JSON.stringify(envelope), { status: 200 })) as unknown as typeof fetch

type FakeApi = Pick<ApiClient, 'createProject' | 'saveScene'> & { createProject: Mock; saveScene: Mock }

function fakeApi(overrides: { saveScene?: Mock } = {}): FakeApi {
  return {
    createProject: vi.fn(async () => created),
    saveScene: overrides.saveScene ?? vi.fn(async () => ({ version: 2 })),
  } as unknown as FakeApi
}

describe('createFromTemplate', () => {
  it('pide la plantilla ANTES de crear el proyecto y guarda su escena con la versión 1', async () => {
    const order: string[] = []
    const api = fakeApi()
    api.createProject.mockImplementation(async () => {
      order.push('crear')
      return created
    })
    const fetchImpl = vi.fn(async () => {
      order.push('pedir')
      return new Response(JSON.stringify(envelope), { status: 200 })
    }) as unknown as typeof fetch
    const result = await createFromTemplate(api, { name: 'Mi tienda', kind: 'comercio', templateId: 'concept-store' }, fetchImpl)
    expect(order).toEqual(['pedir', 'crear'])
    expect(api.saveScene).toHaveBeenCalledWith(ID, envelope, 1)
    expect(result).toMatchObject({ project: created, saved: true })
  })

  it('sin plantilla (en blanco) no pide archivos ni guarda escena', async () => {
    const api = fakeApi()
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const result = await createFromTemplate(api, { name: 'En blanco', kind: 'vivienda', templateId: null }, fetchImpl)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(api.saveScene).not.toHaveBeenCalled()
    expect(result).toMatchObject({ saved: true, envelope: null })
  })

  it('si la plantilla no carga NO crea el proyecto', async () => {
    const api = fakeApi()
    const fetchImpl = vi.fn(async () => new Response('no', { status: 404 })) as unknown as typeof fetch
    await expect(createFromTemplate(api, { name: 'x', kind: 'comercio', templateId: 'cafe' }, fetchImpl)).rejects.toBeInstanceOf(TemplateError)
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('si no hay red tampoco crea el proyecto y avisa en castellano', async () => {
    const api = fakeApi()
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    await expect(createFromTemplate(api, { name: 'x', kind: 'comercio', templateId: 'cafe' }, fetchImpl)).rejects.toThrow('No pudimos cargar la plantilla')
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('mide el límite de 5 MB en bytes y no en caracteres', async () => {
    const api = fakeApi()
    const big = 'é'.repeat(3_000_000) // 3 millones de caracteres, 6 MB en UTF-8
    const fetchImpl = vi.fn(async () => new Response(big, { status: 200 })) as unknown as typeof fetch
    await expect(createFromTemplate(api, { name: 'x', kind: 'comercio', templateId: 'cafe' }, fetchImpl)).rejects.toThrow('5 MB')
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('rechaza una plantilla con formato inválido antes de crear nada', async () => {
    const api = fakeApi()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ schemaVersion: 9 }), { status: 200 })) as unknown as typeof fetch
    await expect(createFromTemplate(api, { name: 'x', kind: 'comercio', templateId: 'cafe' }, fetchImpl)).rejects.toThrow('formato esperado')
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('rechaza una plantilla que no existe', async () => {
    const api = fakeApi()
    await expect(createFromTemplate(api, { name: 'x', kind: 'comercio', templateId: 'fantasma' }, okFetch())).rejects.toThrow('plantilla')
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('si falla el guardado devuelve el proyecto y la escena para reintentar, sin crear otro', async () => {
    const saveScene: Mock = vi.fn().mockRejectedValueOnce(new Error('caída')).mockResolvedValueOnce({ version: 2 })
    const api = fakeApi({ saveScene })
    const first = await createFromTemplate(api, { name: 'Mi tienda', kind: 'comercio', templateId: 'cafe' }, okFetch())
    expect(first).toMatchObject({ project: created, saved: false })
    expect(first.error).toBeInstanceOf(Error)
    const second = await retrySaveTemplate(api, first)
    expect(second.saved).toBe(true)
    expect(api.createProject).toHaveBeenCalledTimes(1)
    expect(saveScene).toHaveBeenCalledTimes(2)
  })
})

describe('normalizeProjectName', () => {
  it('recorta espacios y devuelve null si no queda nada', () => {
    expect(normalizeProjectName('  Mi tienda  ')).toBe('Mi tienda')
    expect(normalizeProjectName('     ')).toBeNull()
    expect(normalizeProjectName('')).toBeNull()
  })
})
