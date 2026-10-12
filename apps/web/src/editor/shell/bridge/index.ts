import { type CatalogDeps, createCatalogSlice } from './catalog'
import { type CoreDeps, createCoreSlice } from './core'
import { type LevelsDeps, createLevelsSlice } from './levels'
import { type ModeDeps, createModeSlice } from './mode'
import { createToolsSlice } from './tools'

export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps

/** El puente: todo lo que el shell sabe hacer con Pascal, con dependencias inyectadas (los dobles de las pruebas o los almacenes reales). */
export function createBridge(deps: BridgeDeps) {
  return {
    ...createCoreSlice(deps),
    ...createModeSlice(deps),
    ...createToolsSlice(deps),
    ...createLevelsSlice(deps),
    ...createCatalogSlice(deps),
    // @@slices
  }
}

export type ShellBridge = ReturnType<typeof createBridge>
