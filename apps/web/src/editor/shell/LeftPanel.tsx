'use client'

import { activeDockId, leftPanelFor } from './dock-model'
import { FurniturePanel } from './FurniturePanel'
import type { CatalogItemLike } from './furniture-model'
import { LevelsPanel } from './LevelsPanel'
import { MaterialsPanel } from './MaterialsPanel'
import { useShell } from './use-bridge'

/** Panel izquierdo: lo manda el dock (Muebles trae el catálogo, Materiales las muestras; lo demás, plantas y ambientes). En Ver, siempre plantas y ambientes. */
export function LeftPanel({ catalog }: { catalog: readonly CatalogItemLike[] }) {
  const panel = useShell((s) =>
    s.scene.readOnly ? 'levels' : leftPanelFor(activeDockId({ mode: s.editor.mode, tool: s.editor.tool })),
  )
  if (panel === 'furniture') return <FurniturePanel items={catalog} />
  if (panel === 'materials') return <MaterialsPanel />
  return <LevelsPanel />
}
