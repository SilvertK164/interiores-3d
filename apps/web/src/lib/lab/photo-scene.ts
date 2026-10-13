import type { TemplateDefinition } from '../templates/types'
import { type AnalysisAssetLike, analysisToDefinition } from './analysis-to-definition'
import { type CameraPose, photoSceneCamera } from './photo-camera'
import { type PlanPreview, type PreviewAsset, planPreview } from './plan-preview'
import type { RoomAnalysis } from './schema'

/**
 * Lo que la persona revisa antes de crear el proyecto: la escena que sale del plano (`analysisToDefinition`), la cámara 3D con la que abrirá el
 * editor, lo que el acomodador corrigió o dejó afuera (`warnings`, en castellano) y la vista previa desde arriba (`planPreview`). Se arma una sola
 * vez al terminar el análisis y es lo mismo que luego se guarda: lo que se ve en la vista previa es lo que abre el editor. Pura (sin Pascal).
 */
export type PhotoScene = {
  definition: TemplateDefinition
  /** La cámara 3D de la foto, en las coordenadas de la escena (`photoSceneCamera`). */
  camera: CameraPose
  warnings: string[]
  plan: PlanPreview
}

/** `resolve` es el catálogo local: da la pieza de un `asset_id` con su tamaño real (o `undefined` si no la tiene). */
export function photoScene<T extends AnalysisAssetLike & PreviewAsset>(analysis: RoomAnalysis, resolve: (assetId: string) => T | undefined): PhotoScene {
  const warnings: string[] = []
  const definition = analysisToDefinition(analysis, resolve, { warn: (message) => warnings.push(message) })
  return { definition, camera: photoSceneCamera(analysis.camera, definition), warnings, plan: planPreview(definition, resolve, analysis.camera) }
}
