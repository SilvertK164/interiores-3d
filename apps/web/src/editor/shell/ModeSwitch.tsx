'use client'

import { Eye, PenLine } from 'lucide-react'
import { selectShellState } from './bridge/selectors'
import { type SegItem, Segmented } from './ui/primitives'
import { useBridge, useShell } from './use-bridge'

const MODES: readonly SegItem<'ver' | 'editar'>[] = [
  { id: 'ver', icon: Eye, label: 'Ver' },
  { id: 'editar', icon: PenLine, label: 'Editar' },
]

/** Ver | Editar: Ver es el modo de solo lectura de Pascal (D3). */
export function ModeSwitch() {
  const bridge = useBridge()
  const mode = useShell((s) => selectShellState(s).mode)
  return <Segmented label="Modo del editor" items={MODES} value={mode} onChange={bridge.setMode} />
}
