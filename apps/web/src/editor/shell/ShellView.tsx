'use client'

import { useState } from 'react'
import { imageFileName } from '@/lib/export/file-name'
import type { CameraMode, LevelMode, Shading, WallMode } from './bridge/types'
import { selectViewOptions } from './bridge/view'
import { DECISIONS, type Decisions } from './decisions'
import { ExportButtons, ViewBar, ViewPanel } from './ui/ViewControls'
import { downloadBlob } from './download-blob'
import { type ImageStyle, toPng } from './to-png'
import { useBridge, useShell } from './use-bridge'
import { viewActions, viewGroups } from './view-model'

/** Lo que se ve en Ver: el panel Vista 3D, la barra de cámara y los botones de exportar (plano e imagen 3D). */
export function ShellView({
  decisions = DECISIONS,
  onExportPlan,
  projectName = 'proyecto',
}: {
  decisions?: Pick<Decisions, 'cameraControl' | 'styleControl' | 'walkthrough'>
  onExportPlan?: (opener: HTMLElement | null) => void
  projectName?: string
}) {
  const bridge = useBridge()
  const options = useShell(selectViewOptions)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageStyle, setImageStyle] = useState<ImageStyle>('color')
  const exportImage = async () => {
    if (imageBusy) return
    setImageBusy(true)
    setImageError(false)
    try {
      downloadBlob(await toPng(await bridge.image.captureIsometric(), imageStyle), imageFileName(projectName, imageStyle))
    } catch {
      setImageError(true)
    } finally {
      setImageBusy(false)
    }
  }
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
      {imageError && (
        <p role="alert" className="absolute bottom-24 right-5 z-10 rounded-xl bg-white px-3 py-2 text-sm text-danger-ink">
          No pudimos generar la imagen. Inténtalo de nuevo.
        </p>
      )}
      <ExportButtons imageBusy={imageBusy} imageStyle={imageStyle} onImageStyle={setImageStyle} onExportImage={() => void exportImage()} onExportPlan={onExportPlan} />
    </>
  )
}
