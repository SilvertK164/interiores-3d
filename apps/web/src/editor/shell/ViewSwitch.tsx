'use client'

import { Box, Columns2, Map as MapIcon } from 'lucide-react'
import { selectShellState } from './bridge/selectors'
import type { ViewMode } from './bridge/types'
import { type SegItem, Segmented } from './ui/primitives'
import { useBridge, useShell } from './use-bridge'

const VIEWS: readonly SegItem<ViewMode>[] = [
  { id: '2d', icon: MapIcon, label: '2D' },
  { id: '3d', icon: Box, label: '3D' },
  { id: 'split', icon: Columns2, label: 'Ambas' },
]

/** 2D | 3D | Ambas = `setViewMode('2d' | '3d' | 'split')` de Pascal (se conserva al recargar: Pascal lo guarda). */
export function ViewSwitch() {
  const bridge = useBridge()
  const view = useShell((s) => selectShellState(s).view)
  return <Segmented label="Vista del plano" items={VIEWS} value={view} onChange={bridge.setView} />
}
