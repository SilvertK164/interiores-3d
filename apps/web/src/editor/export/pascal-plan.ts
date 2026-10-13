import { getCatalogMaterialById, useScene } from '@pascal-app/core'
import { type FloorplanPagesOptions, exportFloorplanPages, measureFloorplanLevels } from '@pascal-app/editor'
import { EXPORT_DECISIONS } from '@/lib/export/decisions'
import type { LevelMeasure, PlanDeps } from '@/lib/export/types'
import { materialNameEs } from '@/lib/material-es'
import { type PagesOptions, type SceneNode, type ScenePort, createBuildPlan } from './build-plan'
import { loadPdfFonts } from './pdf-fonts'

/**
 * Pascal monta el plano con `flushSync` para medirlo y dibujarlo, y React no admite `flushSync` dentro de un efecto ni de un
 * renderizado: el diálogo pide medir desde un efecto, así que todo se hace desde un turno aparte (medido en la Tarea 0b, M2).
 */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

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
    exportPages: async (options: PagesOptions) => {
      await nextTask()
      return exportFloorplanPages(options as unknown as FloorplanPagesOptions)
    },
    scene,
    loadFonts: () => loadPdfFonts(),
    decisions: EXPORT_DECISIONS,
  })
  return {
    measureLevels: async (): Promise<LevelMeasure[]> => {
      await nextTask()
      return measureFloorplanLevels()
    },
    buildPlan,
  }
}
