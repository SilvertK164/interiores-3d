'use client'

import { useEffect, useRef, useState } from 'react'
import type { SaverStatus } from '../scene-saver'
import type { ShellBridge } from './bridge'
import { selectShellState } from './bridge/selectors'
import { ExportPlanDialog } from './ExportPlanDialog'
import type { CatalogItemLike } from './furniture-model'
import { installKeyTrap } from './key-trap'
import { LeftPanel } from './LeftPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { ShellDock } from './ShellDock'
import { ShellTopBar } from './ShellTopBar'
import { ShellUndoRedo } from './ShellUndoRedo'
import { ShellView } from './ShellView'
import { WalkthroughHint } from './WalkthroughHint'
import { useFrameViews } from './use-frame-views'
import { BridgeProvider, useShell } from './use-bridge'

/** Encuadra las vistas; vive dentro del proveedor del puente. */
function FrameViews() {
  useFrameViews()
  return null
}

function ShellBody({ catalog, onExportPlan }: { catalog: readonly CatalogItemLike[]; onExportPlan: (opener: HTMLElement | null) => void }) {
  const { mode, firstPerson } = useShell((s) => {
    const state = selectShellState(s)
    return { mode: state.mode, firstPerson: state.firstPerson }
  })
  if (firstPerson) return <WalkthroughHint />
  return (
    <>
      <LeftPanel catalog={catalog} />
      {mode === 'editar' ? (
        <>
          <ShellDock onExportPlan={onExportPlan} />
          <ShellUndoRedo />
          <PropertiesPanel />
        </>
      ) : (
        <ShellView onExportPlan={onExportPlan} />
      )}
    </>
  )
}

/**
 * El shell de Madori sobre el lienzo de Pascal: un contenedor que deja pasar los clics (`pointer-events-none`) con piezas que sí
 * los reciben. Va por debajo de los diálogos de Pascal (`z-50`) y de su cargador (`z-60`). Lee el estado real de Pascal por el
 * puente; nunca supone la herramienta ni la selección con que se abre.
 */
export function EditorShell({
  bridge,
  catalog,
  projectName,
  author = '',
  saveStatus,
  onBack,
  backBusy,
}: {
  bridge: ShellBridge
  catalog: readonly CatalogItemLike[]
  projectName: string
  /** Nombre de la cuenta (o el correo): va en el cajetín del plano. */
  author?: string
  saveStatus: SaverStatus
  onBack: () => void
  backBusy?: boolean
}) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportOpener = useRef<HTMLElement | null>(null)
  const openExport = (opener: HTMLElement | null) => {
    exportOpener.current = opener
    setExportOpen(true)
  }
  useEffect(() => {
    const stop = bridge.mountDefaults()
    // Las teclas de Pascal no llegan a sus atajos con el foco en un botón del shell, ni en Ver (donde Ctrl+Z ni siquiera
    // debe deshacer: el historial de Pascal no mira el solo lectura).
    const untrap = installKeyTrap({
      state: () => {
        const { mode, firstPerson } = selectShellState(bridge.snapshot())
        return { mode, walking: firstPerson }
      },
    })
    return () => {
      untrap()
      stop()
      bridge.dispose()
    }
  }, [bridge])
  return (
    <BridgeProvider bridge={bridge}>
      <div data-editor-shell className="editor-shell pointer-events-none absolute inset-0 z-40 overflow-hidden">
        <FrameViews />
        <ShellTopBar name={projectName} saveStatus={saveStatus} onBack={onBack} backBusy={backBusy} />
        <ShellBody catalog={catalog} onExportPlan={openExport} />
        <ExportPlanDialog author={author} onClose={() => setExportOpen(false)} open={exportOpen} opener={exportOpener} projectName={projectName} />
      </div>
    </BridgeProvider>
  )
}
