import { type CatalogDeps, createCatalogSlice } from './catalog'
import { type ClusterDeps, createClusterSlice } from './cluster'
import { type CoreDeps, createCoreSlice } from './core'
import { type EditDeps, createEditSlice } from './edit'
import { type FrameDeps, createFrameSlice } from './frame'
import { type ImageDeps, createImageSlice } from './image'
import { type LevelsManageDeps, createLevelManageSlice } from './level-manage'
import { type LevelsDeps, createLevelsSlice } from './levels'
import { type MaterialsDeps, createMaterialsSlice } from './materials'
import { type ModeDeps, createModeSlice } from './mode'
import { type PlanDeps, createPlanSlice } from './plan'
import { type PresetsDeps, createPresetsSlice } from './presets'
import { type ViewDeps, createViewSlice } from './view'
import { createToolsSlice } from './tools'

export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps & EditDeps & ViewDeps & PresetsDeps & LevelsManageDeps & FrameDeps & PlanDeps & ImageDeps & ClusterDeps

/** El puente: todo lo que el shell sabe hacer con Pascal, con dependencias inyectadas (los dobles de las pruebas o los almacenes reales). */
export function createBridge(deps: BridgeDeps) {
  const mode = createModeSlice(deps)
  const frame = createFrameSlice(deps)
  return {
    ...createCoreSlice(deps),
    ...mode,
    ...createToolsSlice(deps),
    ...createLevelsSlice(deps),
    ...createCatalogSlice(deps),
    ...createMaterialsSlice(deps),
    ...createEditSlice(deps),
    ...createViewSlice(deps),
    ...createPresetsSlice(deps),
    ...createLevelManageSlice(deps),
    ...frame,
    ...createPlanSlice(deps),
    ...createImageSlice(deps),
    ...createClusterSlice(deps),
    // @@slices
    /** Al desmontar el shell: suelta el solo lectura (modo) y la cámara retenida (encuadre). */
    dispose(): void {
      frame.releaseCameraPose()
      mode.dispose()
    },
  }
}

export type ShellBridge = ReturnType<typeof createBridge>
