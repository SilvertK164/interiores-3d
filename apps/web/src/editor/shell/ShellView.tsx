'use client'

import type { CameraMode, LevelMode, Shading, WallMode } from './bridge/types'
import { selectViewOptions } from './bridge/view'
import { DECISIONS, type Decisions } from './decisions'
import { ShareRender, ViewBar, ViewPanel } from './ui/ViewControls'
import { useBridge, useShell } from './use-bridge'
import { viewActions, viewGroups } from './view-model'

/** Lo que se ve en Ver: el panel Vista 3D, la barra de cámara y Compartir y Renderizar (deshabilitados con "Pronto"). */
export function ShellView({
  decisions = DECISIONS,
  onExportPlan,
}: {
  decisions?: Pick<Decisions, 'cameraControl' | 'styleControl' | 'walkthrough'>
  onExportPlan?: (opener: HTMLElement | null) => void
}) {
  const bridge = useBridge()
  const options = useShell(selectViewOptions)
  return (
    <>
      <ViewPanel
        groups={viewGroups(options, decisions)}
        onPick={(group, value) => {
          if (group === 'walls') bridge.setWalls(value as WallMode)
          else if (group === 'levels') bridge.setLevels(value as LevelMode)
          else if (group === 'camera') bridge.setCamera(value as CameraMode)
          else if (group === 'shading') bridge.setShading(value as Shading)
        }}
      />
      <ViewBar
        actions={viewActions(decisions)}
        onAction={(id) => {
          if (id === 'walk') bridge.startWalkthrough()
          else if (id === 'orbit-left' || id === 'orbit-right' || id === 'top') bridge.moveCamera(id)
        }}
      />
      <ShareRender onExportPlan={onExportPlan} />
    </>
  )
}
