'use client'

import { createContext, type ReactNode, useContext, useRef, useSyncExternalStore } from 'react'
import type { ShellBridge } from './bridge'
import type { BridgeSnapshot } from './bridge/types'
import { deepEqual } from './equal'

const BridgeContext = createContext<ShellBridge | null>(null)

export function BridgeProvider({ bridge, children }: { bridge: ShellBridge; children: ReactNode }) {
  return <BridgeContext.Provider value={bridge}>{children}</BridgeContext.Provider>
}

export function useBridge(): ShellBridge {
  const bridge = useContext(BridgeContext)
  if (!bridge) throw new Error('Falta <BridgeProvider> alrededor del shell del editor.')
  return bridge
}

/**
 * Lee del estado real de Pascal lo que `select` pida. Solo vuelve a pintar si el resultado cambió **de valor**: Pascal avisa
 * en cada cambio de su escena (por ejemplo al arrastrar un muro) y los selectores arman listas nuevas cada vez.
 */
export function useShell<T>(select: (snapshot: BridgeSnapshot) => T, equals: (a: T, b: T) => boolean = deepEqual): T {
  const bridge = useBridge()
  const last = useRef<{ value: T } | null>(null)
  const read = () => {
    const next = select(bridge.snapshot())
    if (last.current && equals(last.current.value, next)) return last.current.value
    last.current = { value: next }
    return next
  }
  return useSyncExternalStore(bridge.subscribe, read, read)
}
