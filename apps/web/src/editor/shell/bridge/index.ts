import { type CoreDeps, createCoreSlice } from './core'
import { type ModeDeps, createModeSlice } from './mode'

export type BridgeDeps = CoreDeps & ModeDeps

/** El puente: todo lo que el shell sabe hacer con Pascal, con dependencias inyectadas (los dobles de las pruebas o los almacenes reales). */
export function createBridge(deps: BridgeDeps) {
  return {
    ...createCoreSlice(deps),
    ...createModeSlice(deps),
    // @@slices
  }
}

export type ShellBridge = ReturnType<typeof createBridge>
