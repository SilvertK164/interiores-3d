import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PASCAL_CORE_VERSION, SCENE_MAX_BYTES, SCHEMA_VERSION, SceneEnvelopeSchema } from '@interiores/contract'
import { type Mock, describe, expect, it, vi } from 'vitest'
import { buildLabEnvelope, openDefinitionAsProject } from '../src/editor/lab-scene'
import { type AssetLike, MATERIAL_IDS } from '../src/editor/templates/scene-builder'
import type { ApiClient } from '../src/lib/api/client'
import { LabError } from '../src/lib/lab/lab-error'
import type { CameraPose } from '../src/lib/lab/photo-camera'
import { photoCameraKey } from '../src/lib/lab/photo-camera-handoff'
import { TEMPLATE_DEFINITIONS } from '../src/lib/templates'
import { retrySaveTemplate } from '../src/lib/templates/create-from-template'
import { perimeter } from '../src/lib/templates/geometry'
import type { LevelDef, TemplateDefinition } from '../src/lib/templates/types'
import { validateDefinition } from '../src/lib/templates/validate'
import { availableAssetIds } from './support/asset-ids'

// La plomería no sabe de fotos: se prueba con una definición cualquiera, el loft de las plantillas.
const loft = TEMPLATE_DEFINITIONS.find((d) => d.id === 'loft') as TemplateDefinition
const asset = (id: string): AssetLike => ({
  id,
  category: 'furniture',
  name: id,
  tags: [],
  src: `/items/${id}/model.glb`,
  thumbnail: `/items/${id}/thumbnail.webp`,
  dimensions: [1, 1, 1],
})
const ASSETS = new Map([...availableAssetIds()].map((id) => [id, asset(id)] as const))

const ID = '0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'
const created = { id: ID, name: 'Desde una foto · prueba', kind: 'vivienda' as const, templateId: null, version: 1 as const }
type FakeApi = Pick<ApiClient, 'createProject' | 'saveScene'> & { createProject: Mock; saveScene: Mock }
const fakeApi = (saveScene: Mock = vi.fn(async () => ({ version: 2 }))): FakeApi =>
  ({ createProject: vi.fn(async () => created), saveScene }) as unknown as FakeApi

const withUnknownPiece = (): TemplateDefinition => ({
  ...loft,
  levels: loft.levels.map((level, i) => (i === 0 ? { ...level, items: [...level.items, { asset: 'pieza-que-no-existe', at: [2, 2] as [number, number] }] } : level)) as LevelDef[],
})

function nodeCounts(nodes: Record<string, unknown>): Record<string, number> {
  const total: Record<string, number> = {}
  for (const n of Object.values(nodes) as { type: string }[]) total[n.type] = (total[n.type] ?? 0) + 1
  return total
}

describe('buildLabEnvelope', () => {
  const envelope = buildLabEnvelope(loft, ASSETS)

  it('devuelve un SceneEnvelope válido, con la versión del contrato y la de Pascal', () => {
    expect(SceneEnvelopeSchema.safeParse(envelope).success).toBe(true)
    expect(envelope.schemaVersion).toBe(SCHEMA_VERSION)
    expect(envelope.pascal.core).toBe(PASCAL_CORE_VERSION)
    expect(JSON.stringify(envelope).length).toBeLessThan(SCENE_MAX_BYTES)
  })

  it('arma la misma escena que el generador de plantillas (mismos nodos por tipo que public/templates/loft.json)', () => {
    const committed = JSON.parse(readFileSync(fileURLToPath(new URL('../public/templates/loft.json', import.meta.url)), 'utf8'))
    expect(nodeCounts(envelope.graph.nodes)).toEqual(nodeCounts(committed.graph.nodes))
  })

  it('si la definición no es válida explica cada problema en castellano, sin nombrar funciones del código', () => {
    const error = (() => {
      try {
        buildLabEnvelope(withUnknownPiece(), ASSETS)
      } catch (e) {
        return e
      }
    })()
    expect(error).toBeInstanceOf(LabError)
    expect((error as LabError).code).toBe('definicion_invalida')
    expect((error as LabError).message).toMatch(/pieza-que-no-existe/)
    expect((error as LabError).message).toMatch(/No pudimos dibujar el ambiente/)
    expect((error as LabError).message).not.toMatch(/analysisToDefinition/)
  })
})

// Es el ejemplo mínimo de lab/README.md: si esta prueba deja de pasar, el README necesita una actualización.
describe('una definición mínima (un ambiente, una puerta y una pieza)', () => {
  const minimal: TemplateDefinition = {
    id: 'ejemplo',
    kind: 'vivienda',
    name: 'Ambiente de ejemplo',
    summary: 'Un ambiente y una pieza.',
    levels: [
      {
        id: 'planta',
        walls: perimeter('muro', 0, 0, 5, 3.5),
        rooms: [{ id: 'sala', name: 'Sala', color: '#1F5FE0', rect: [0, 0, 5, 3.5] }],
        openings: [{ id: 'puerta', type: 'door', wall: 'muro-s', at: 1, width: 0.9 }],
        items: [{ asset: 'sofa', at: [2.5, 2.5], rotY: 0 }],
      },
    ],
  }

  it('pasa el validador con las piezas y los materiales reales', () => {
    expect(validateDefinition(minimal, availableAssetIds(), MATERIAL_IDS)).toEqual([])
  })

  it('se convierte en una escena con su nivel, sus cuatro muros, la puerta, el ambiente y la pieza', () => {
    const counts = nodeCounts(buildLabEnvelope(minimal, ASSETS).graph.nodes)
    expect(counts).toMatchObject({ level: 1, wall: 4, door: 1, zone: 1, slab: 1, item: 1 })
  })
})

describe('openDefinitionAsProject', () => {
  it('crea el proyecto, guarda la escena con la versión 1 y abre el editor', async () => {
    const api = fakeApi()
    const navigate = vi.fn()
    const result = await openDefinitionAsProject(loft, { api, name: 'Desde una foto · prueba', navigate, assets: ASSETS })
    expect(api.createProject).toHaveBeenCalledWith({ name: 'Desde una foto · prueba', kind: 'vivienda' })
    expect(api.saveScene).toHaveBeenCalledWith(ID, result.envelope, 1)
    expect(SceneEnvelopeSchema.safeParse(result.envelope).success).toBe(true)
    expect(navigate).toHaveBeenCalledWith(`/proyectos/${ID}`)
    expect(result).toMatchObject({ project: created, saved: true })
  })

  it('el tipo de proyecto se puede cambiar', async () => {
    const api = fakeApi()
    await openDefinitionAsProject(loft, { api, name: 'x', kind: 'comercio', navigate: vi.fn(), assets: ASSETS })
    expect(api.createProject).toHaveBeenCalledWith({ name: 'x', kind: 'comercio' })
  })

  it('valida la definición ANTES de crear el proyecto: si no sirve, no queda un proyecto vacío', async () => {
    const api = fakeApi()
    const navigate = vi.fn()
    await expect(openDefinitionAsProject(withUnknownPiece(), { api, name: 'x', navigate, assets: ASSETS })).rejects.toBeInstanceOf(LabError)
    expect(api.createProject).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('si falla el guardado devuelve el proyecto y la escena para reintentar, sin abrir el editor ni crear otro proyecto', async () => {
    const saveScene = vi.fn().mockRejectedValueOnce(new Error('sin red')).mockResolvedValue({ version: 2 })
    const api = fakeApi(saveScene)
    const navigate = vi.fn()
    const result = await openDefinitionAsProject(loft, { api, name: 'x', navigate, assets: ASSETS })
    expect(result).toMatchObject({ saved: false, project: created })
    expect(result.error).toBeInstanceOf(Error)
    expect(navigate).not.toHaveBeenCalled()

    const retried = await retrySaveTemplate(api, result)
    expect(retried.saved).toBe(true)
    expect(api.createProject).toHaveBeenCalledTimes(1)
    expect(api.saveScene).toHaveBeenCalledTimes(2)
  })
})

describe('openDefinitionAsProject: la cámara de la foto', () => {
  const camera: CameraPose = { position: [0, 1.55, 1.2], target: [0, 0.75, -0.742], fov: 60 }
  /** Sustituye `window.sessionStorage` por un Map mientras dura la prueba. */
  function withSessionStorage<T>(run: (data: Map<string, string>) => Promise<T>, failWrites = false): Promise<T> {
    const data = new Map<string, string>()
    const sessionStorage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (failWrites) throw new DOMException('cuota', 'QuotaExceededError')
        data.set(key, value)
      },
      removeItem: (key: string) => void data.delete(key),
    }
    vi.stubGlobal('window', { sessionStorage })
    return run(data).finally(() => vi.unstubAllGlobals())
  }

  it('la guarda para el proyecto nuevo ANTES de navegar al editor', () =>
    withSessionStorage(async (data) => {
      const seen: (string | undefined)[] = []
      const navigate = vi.fn(() => seen.push(data.get(photoCameraKey(ID))))
      await openDefinitionAsProject(loft, { api: fakeApi(), name: 'x', navigate, assets: ASSETS, camera })
      expect(navigate).toHaveBeenCalledWith(`/proyectos/${ID}`)
      expect(JSON.parse(seen[0] ?? 'null')).toEqual(camera)
    }))

  it('sin cámara no escribe nada (el Loft de prueba no es de una foto)', () =>
    withSessionStorage(async (data) => {
      await openDefinitionAsProject(loft, { api: fakeApi(), name: 'x', navigate: vi.fn(), assets: ASSETS })
      expect(data.size).toBe(0)
    }))

  it('si no se pudo guardar la escena no guarda la cámara: el editor todavía no se abre (se guarda al reintentar)', () =>
    withSessionStorage(async (data) => {
      const api = fakeApi(vi.fn().mockRejectedValue(new Error('sin red')))
      const result = await openDefinitionAsProject(loft, { api, name: 'x', navigate: vi.fn(), assets: ASSETS, camera })
      expect(result.saved).toBe(false)
      expect(data.size).toBe(0)
    }))

  it('si el almacenamiento falla, el editor se abre igual (con su encuadre normal)', () =>
    withSessionStorage(async () => {
      const navigate = vi.fn()
      await openDefinitionAsProject(loft, { api: fakeApi(), name: 'x', navigate, assets: ASSETS, camera })
      expect(navigate).toHaveBeenCalledWith(`/proyectos/${ID}`)
    }, true))
})
