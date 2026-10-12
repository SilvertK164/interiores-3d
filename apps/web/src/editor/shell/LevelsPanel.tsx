'use client'

import { useRef, useState } from 'react'
import { formatArea } from '@/lib/format'
import { selectLevels, selectZones } from './bridge/levels'
import { LevelPanel } from './ui/LevelPanel'
import { useDismiss } from './use-dismiss'
import { useBridge, useShell } from './use-bridge'

/** Panel izquierdo: planta activa (con crear planta) y ambientes con sus m². En Ver no se crean plantas ni se eligen ambientes. */
export function LevelsPanel() {
  const bridge = useBridge()
  const { levels, activeId } = useShell(selectLevels)
  const { zones, selectedId } = useShell(selectZones)
  const readOnly = useShell((s) => s.scene.readOnly)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useDismiss(open, root, () => setOpen(false))
  return (
    <div ref={root}>
      <LevelPanel
        picker={{
          levels,
          activeId,
          open,
          canAdd: !readOnly,
          onToggle: () => setOpen((value) => !value),
          onPick: (id) => {
            bridge.selectLevel(id)
            setOpen(false)
          },
          onAdd: () => {
            bridge.addLevel()
            setOpen(false)
          },
        }}
        zones={{
          zones: zones.map((z) => ({ id: z.id, name: z.name, area: formatArea(z.area) })),
          selectedId,
          disabled: readOnly,
          onPick: bridge.selectZone,
        }}
      />
    </div>
  )
}
