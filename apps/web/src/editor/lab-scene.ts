import {
  PASCAL_CORE_VERSION,
  type ProjectKind,
  SCENE_MAX_BYTES,
  SCHEMA_VERSION,
  type SceneEnvelope,
  SceneEnvelopeSchema,
} from '@interiores/contract'
import type { ApiClient } from '../lib/api/client'
import { type AnalysisCatalog, buildAnalysisCatalog } from '../lib/lab/analysis-catalog'
import { LabError } from '../lib/lab/lab-error'
import { type CreateFromTemplateResult, retrySaveTemplate } from '../lib/templates/create-from-template'
import type { TemplateDefinition } from '../lib/templates/types'
import { buildAssetMap } from './catalog-assets'
import { type AssetLike, buildScene } from './templates/scene-builder'

/**
 * Convierte cualquier definición válida en el sobre de escena que guarda la API (mismas versiones que las plantillas).
 * Si la definición tiene un problema, lo explica en castellano con la lista del validador, en un `LabError` que la página muestra tal cual.
 */
export function buildLabEnvelope(definition: TemplateDefinition, assets: ReadonlyMap<string, AssetLike>): SceneEnvelope {
  let graph: ReturnType<typeof buildScene>
  try {
    graph = buildScene(definition, assets)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new LabError(`No pudimos dibujar el ambiente de tu foto.\n${detail}`, 'definicion_invalida')
  }
  const envelope = SceneEnvelopeSchema.parse({ schemaVersion: SCHEMA_VERSION, pascal: { core: PASCAL_CORE_VERSION }, graph })
  if (new TextEncoder().encode(JSON.stringify(envelope)).length > SCENE_MAX_BYTES) {
    throw new LabError('La escena supera el límite de 4 MB y no se puede guardar.', 'escena_demasiado_grande')
  }
  return envelope
}

let catalog: Promise<ReadonlyMap<string, AssetLike>> | undefined

/** Piezas del catálogo de Pascal con modelo local. Se pide recién al hacer falta, para no cargar el editor antes de tiempo. */
function catalogAssets(): Promise<ReadonlyMap<string, AssetLike>> {
  catalog ??= import('@pascal-app/editor')
    .then(({ CATALOG_ITEMS }) => buildAssetMap(CATALOG_ITEMS))
    .catch((error) => {
      catalog = undefined
      throw error
    })
  return catalog
}

let analysis: Promise<AnalysisCatalog<AssetLike>> | undefined

/**
 * Lo que se le ofrece al análisis al analizar una foto y con lo que se resuelve su respuesta: las piezas reconocibles del catálogo
 * local (`buildAnalysisCatalog`). Es la misma lista que usa «Muebles desde una foto» en el editor; la página «Escena desde una foto»
 * la pide acá para no importar Pascal.
 */
export function analysisCatalog(): Promise<AnalysisCatalog<AssetLike>> {
  analysis ??= catalogAssets()
    .then((assets) => buildAnalysisCatalog([...assets.values()]))
    .catch((error) => {
      analysis = undefined
      throw error
    })
  return analysis
}

export type OpenDefinitionOptions = {
  api: Pick<ApiClient, 'createProject' | 'saveScene'>
  /** Nombre del proyecto nuevo. */
  name: string
  /** Se llama con la ruta del editor cuando la escena quedó guardada. */
  navigate: (path: string) => void
  /** `vivienda` por defecto. */
  kind?: ProjectKind
  /** Piezas disponibles; por defecto, el catálogo local de Pascal. */
  assets?: ReadonlyMap<string, AssetLike>
}

/**
 * La plomería completa para una definición cualquiera: arma la escena con `buildScene` (validándola ANTES de crear nada, para no
 * dejar proyectos vacíos), crea el proyecto, guarda la escena y abre el editor. Si falla el guardado devuelve el proyecto y la
 * escena para reintentar con `retrySaveTemplate`, sin crear otro proyecto.
 */
export async function openDefinitionAsProject(definition: TemplateDefinition, opts: OpenDefinitionOptions): Promise<CreateFromTemplateResult> {
  const envelope = buildLabEnvelope(definition, opts.assets ?? (await catalogAssets()))
  const project = await opts.api.createProject({ name: opts.name, kind: opts.kind ?? 'vivienda' })
  const result = await retrySaveTemplate(opts.api, { project, envelope, saved: false })
  if (result.saved) opts.navigate(`/proyectos/${project.id}`)
  return result
}
