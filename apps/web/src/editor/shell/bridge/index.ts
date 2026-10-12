import { type CatalogDeps, createCatalogSlice } from './catalog'
import { type CoreDeps, createCoreSlice } from './core'
import { type EditDeps, createEditSlice } from './edit'
import { type FrameDeps, createFrameSlice } from './frame'
import { type LevelsManageDeps, createLevelManageSlice } from './level-manage'
import { type LevelsDeps, createLevelsSlice } from './levels'
import { type MaterialsDeps, createMaterialsSlice } from './materials'
import { type ModeDeps, createModeSlice } from './mode'
import { type PlanDeps, createPlanSlice } from './plan'
import { type PresetsDeps, createPresetsSlice } from './presets'
import { type ViewDeps, createViewSlice } from './view'
import { createToolsSlice } from './tools'

export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps & EditDeps & ViewDeps & PresetsDeps & LevelsManageDeps & FrameDeps & PlanDeps

/** El puente: todo lo que el shell sabe hacer con Pascal, con dependencias inyectadas (los dobles de las pruebas o los almacenes reales). */
export function createBridge(deps: BridgeDeps) {
  return {
    ...createCoreSlice(deps),
    ...createModeSlice(deps),
    ...createToolsSlice(deps),
    ...createLevelsSlice(deps),
    ...createCatalogSlice(deps),
    ...createMaterialsSlice(deps),
    ...createEditSlice(deps),
    ...createViewSlice(deps),
    ...createPresetsSlice(deps),
    ...createLevelManageSlice(deps),
    ...createFrameSlice(deps),
    ...createPlanSlice(deps),
    // @@slices
  }
}

export type ShellBridge = ReturnType<typeof createBridge>
