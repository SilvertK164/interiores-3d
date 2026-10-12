'use client'

import { useMemo, useState } from 'react'
import { COMMERCE_PASCAL_IDS } from '../commerce-catalog'
import { ALL_CHIP, type CatalogItemLike, FURNITURE_CHIPS, filterFurniture, toCards } from './furniture-model'
import { FurnitureCatalog } from './ui/FurnitureCatalog'
import { useBridge, useShell } from './use-bridge'

const COMMERCE_IDS: ReadonlySet<string> = new Set(COMMERCE_PASCAL_IDS)

/** Panel de muebles del modo Editar: búsqueda, categorías (Comercio incluida) y tarjetas. Elegir una tarjeta arma esa pieza. */
export function FurniturePanel({ items }: { items: readonly CatalogItemLike[] }) {
  const bridge = useBridge()
  const selectedId = useShell((s) => s.editor.selectedItem?.id ?? null)
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState(ALL_CHIP)
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const cards = toCards(filterFurniture(items, { query, chip }, COMMERCE_IDS), selectedId)
  return (
    <FurnitureCatalog
      query={query}
      onQuery={setQuery}
      chips={FURNITURE_CHIPS}
      chip={chip}
      onChip={setChip}
      cards={cards}
      onPick={(id) => {
        const item = byId.get(id)
        if (item) bridge.placeItem(item)
      }}
    />
  )
}
