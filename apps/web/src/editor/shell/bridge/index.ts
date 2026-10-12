import { type CoreDeps, createCoreSlice } from './core'
import { createLevelsSlice } from './levels'
import { type ModeDeps, createModeSlice } from './mode'
import { createToolsSlice } from './tools'

export type BridgeDeps = CoreDeps & ModeDeps

/** El puente: todo lo que el shell sabe hacer con Pascal, con dependencias inyectadas (los dobles de las pruebas o los almacenes reales). */
export function createBridge(deps: BridgeDeps) {
  return {
    ...createCoreSlice(deps),
    ...createModeSlice(deps),
    ...createToolsSlice(deps),
    ...createLevelsSlice(deps),
    // @@slices
  }
}

export type ShellBridge = ReturnType<typeof createBridge>
