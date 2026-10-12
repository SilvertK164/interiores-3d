'use client'

import { useState } from 'react'
import {
  DEFAULT_SURFACE,
  SURFACE_TABS,
  type SurfaceTabId,
  categoriesFor,
  resolveCategory,
  swatchesFor,
} from './materials-model'
import { MaterialsCatalog } from './ui/MaterialsCatalog'
import { useBridge } from './use-bridge'

const TABS = SURFACE_TABS.map((tab) => ({ value: tab.id, label: tab.label }))

/** Panel de materiales del modo Editar. Elegir una muestra arma la pintura con ese material (después se hace clic en lo que se quiera pintar). */
export function MaterialsPanel() {
  const { items, selectedId, select } = useBridge().useMaterials()
  const [tab, setTab] = useState<SurfaceTabId>(DEFAULT_SURFACE)
  const [wanted, setWanted] = useState<string | null>(null)
  const category = resolveCategory(items, tab, wanted)
  return (
    <MaterialsCatalog
      tabs={TABS}
      tab={tab}
      onTab={(value) => setTab(value as SurfaceTabId)}
      categories={categoriesFor(items, tab).map((c) => ({ value: c.id, label: c.label }))}
      category={category}
      onCategory={setWanted}
      swatches={swatchesFor(items, tab, category, selectedId)}
      onPick={select}
    />
  )
}
