'use client'

import { useRef, useState } from 'react'
import {
  type Arming,
  DOCK,
  type DockId,
  MEASURE_ENTRIES,
  type MeasureKind,
  OPENING_ENTRIES,
  type OpeningTool,
  type StructureTool,
  activeDockId,
  armingForButton,
  asMenuEntries,
  structureEntries,
} from './dock-model'
import { MoreMenu } from './MoreMenu'
import { SHORTCUTS } from './more-model'
import { Dock, ToolMenu } from './ui/Dock'
import { ShortcutsDialog } from './ui/ShortcutsDialog'
import { useBridge, useShell } from './use-bridge'
import { useDismiss } from './use-dismiss'

/** El dock del modo Editar. Lo que marca sale del estado REAL de Pascal; cada entrada arma la herramienta por el puente. */
export function ShellDock() {
  const bridge = useBridge()
  const { mode, tool } = useShell((s) => ({ mode: s.editor.mode, tool: s.editor.tool }))
  const [openMenu, setOpenMenu] = useState<DockId | null>(null)
  const [shortcuts, setShortcuts] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Un clic fuera del dock cierra el menú abierto.
  useDismiss(openMenu !== null, root, () => setOpenMenu(null))

  /** Cierra el menú y devuelve el teclado al botón que lo abrió. */
  const closeMenu = () => {
    const was = openMenu
    setOpenMenu(null)
    if (was) queueMicrotask(() => root.current?.querySelector<HTMLElement>(`[data-dock="${was}"]`)?.focus())
  }
  const pick = (arming: Arming) => {
    bridge.arm(arming)
    closeMenu()
  }
  const onSelect = (id: string) => {
    const arming = armingForButton(id as DockId)
    if (arming) {
      setOpenMenu(null)
      bridge.arm(arming)
      return
    }
    setOpenMenu(openMenu === id ? null : (id as DockId))
  }

  const menus = {
    structure: (
      <ToolMenu
        title="Estructura"
        entries={asMenuEntries(structureEntries(), tool)}
        onPick={(id) => {
          if (id === 'stair-curved' || id === 'stair-spiral') {
            bridge.placePreset({ kind: 'stair', stairType: id === 'stair-curved' ? 'curved' : 'spiral' })
            closeMenu()
          } else pick({ kind: 'tool', tool: id as StructureTool })
        }}
        onClose={closeMenu}
      />
    ),
    openings: (
      <ToolMenu
        title="Aberturas"
        entries={asMenuEntries(OPENING_ENTRIES, tool)}
        onPick={(id) => pick({ kind: 'tool', tool: id as OpeningTool })}
        onClose={closeMenu}
      />
    ),
    measure: (
      <ToolMenu
        title="Medir"
        entries={asMenuEntries(MEASURE_ENTRIES, null)}
        onPick={(id) => pick({ kind: 'measure', measure: id as MeasureKind })}
        onClose={closeMenu}
      />
    ),
    more: (
      <MoreMenu
        onClose={closeMenu}
        onShortcuts={() => {
          setShortcuts(true)
          setOpenMenu(null)
        }}
      />
    ),
  }

  return (
    <div ref={root}>
      <Dock
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        items={DOCK}
        active={activeDockId({ mode, tool })}
        openMenu={openMenu}
        onSelect={onSelect}
        menus={menus}
      />
      <ShortcutsDialog open={shortcuts} shortcuts={SHORTCUTS} onClose={() => {
          setShortcuts(false)
          // El panel Más se desmontó al abrir el diálogo: el foco vuelve a su botón.
          root.current?.querySelector<HTMLElement>('[data-dock="more"]')?.focus()
        }} />
    </div>
  )
}
