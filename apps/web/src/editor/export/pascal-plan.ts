import { getCatalogMaterialById, useScene } from '@pascal-app/core'
import { type FloorplanPagesOptions, exportFloorplanPages, measureFloorplanLevels } from '@pascal-app/editor'
import { EXPORT_DECISIONS } from '@/lib/export/decisions'
import type { LevelMeasure, PlanDeps } from '@/lib/export/types'
import { materialNameEs } from '@/lib/material-es'
import { type PagesOptions, type SceneNode, type ScenePort, createBuildPlan } from './build-plan'
import { loadPdfFonts } from './pdf-fonts'

/**
 * Las dos funciones reales de `bridge.plan`: medir con `measureFloorplanLevels` y armar con `exportFloorplanPages` (parche de
 * `@pascal-app/editor`, ver docs/pascal-notes.md). Único lugar de la exportación que toca Pascal, junto con el parche.
 */
export function planDeps(): PlanDeps {
  const scene: ScenePort = {
    nodes: () => useScene.getState().nodes as unknown as Readonly<Record<string, SceneNode>>,
    materialById: (id) => {
      const item = getCatalogMaterialById(id)
      return item ? { label: materialNameEs(id, item.label), category: item.category, previewColor: item.previewColor } : undefined
    },
  }
  const buildPlan = createBuildPlan({
    exportPages: (options: PagesOptions) => exportFloorplanPages(options as unknown as FloorplanPagesOptions),
    scene,
    loadFonts: () => loadPdfFonts(),
    decisions: EXPORT_DECISIONS,
  })
  return {
    measureLevels: async (): Promise<LevelMeasure[]> => measureFloorplanLevels(),
    buildPlan,
  }
}
