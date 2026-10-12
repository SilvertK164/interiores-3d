'use client'

import { UndoRedo } from './ui/UndoRedo'
import { useBridge, useShell } from './use-bridge'

/** Deshacer y Rehacer habilitados según el historial real de Pascal. */
export function ShellUndoRedo() {
  const bridge = useBridge()
  const { canUndo, canRedo } = useShell((s) => ({ canUndo: s.history.canUndo, canRedo: s.history.canRedo }))
  return (
    <UndoRedo
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={bridge.undo}
      onRedo={bridge.redo}
      className="absolute bottom-6 left-5 z-10"
    />
  )
}
