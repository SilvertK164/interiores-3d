import { type CoreDeps, createCoreSlice } from './core'

export type BridgeDeps = CoreDeps

/** El puente: todo lo que el shell sabe hacer con Pascal, con dependencias inyectadas (los dobles de las pruebas o los almacenes reales). */
export function createBridge(deps: BridgeDeps) {
  return {
    ...createCoreSlice(deps),
    // @@slices
  }
}

export type ShellBridge = ReturnType<typeof createBridge>
