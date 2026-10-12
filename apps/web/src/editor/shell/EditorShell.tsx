'use client'

import { useEffect } from 'react'
import type { SaverStatus } from '../scene-saver'
import type { ShellBridge } from './bridge'
import { selectShellState } from './bridge/selectors'
import type { CatalogItemLike } from './furniture-model'
import { LeftPanel } from './LeftPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { ShellDock } from './ShellDock'
import { ShellTopBar } from './ShellTopBar'
import { ShellUndoRedo } from './ShellUndoRedo'
import { ShellView } from './ShellView'
import { BridgeProvider, useShell } from './use-bridge'

function ShellBody({ catalog }: { catalog: readonly CatalogItemLike[] }) {
  const mode = useShell((s) => selectShellState(s).mode)
  return (
    <>
      <LeftPanel catalog={catalog} />
      {mode === 'editar' ? (
        <>
          <ShellDock />
          <ShellUndoRedo />
          <PropertiesPanel />
        </>
      ) : (
        <ShellView />
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
  saveStatus,
  onBack,
  backBusy,
}: {
  bridge: ShellBridge
  catalog: readonly CatalogItemLike[]
  projectName: string
  saveStatus: SaverStatus
  onBack: () => void
  backBusy?: boolean
}) {
  useEffect(() => {
    const stop = bridge.mountDefaults()
    return () => {
      stop()
      bridge.dispose()
    }
  }, [bridge])
  return (
    <BridgeProvider bridge={bridge}>
      <div data-editor-shell className="editor-shell pointer-events-none absolute inset-0 z-40 overflow-hidden">
        <ShellTopBar name={projectName} saveStatus={saveStatus} onBack={onBack} backBusy={backBusy} />
        <ShellBody catalog={catalog} />
      </div>
    </BridgeProvider>
  )
}
