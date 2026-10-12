'use client'

import {
  Archive,
  Box,
  BrickWall,
  DoorOpen,
  Layers2,
  Library,
  type LucideIcon,
  RectangleVertical,
  Sofa,
  Square,
  SquareDashed,
  Triangle,
} from 'lucide-react'
import { useState } from 'react'
import { selectEditTarget } from './bridge/edit'
import { deleteWarning, duplicatePatch, fieldsFor, patchFor, subtitleFor, titleFor } from './properties-model'
import { PropertiesCard } from './ui/PropertiesCard'
import { useBridge, useShell } from './use-bridge'

const ICONS: Readonly<Record<string, LucideIcon>> = {
  wall: BrickWall,
  door: DoorOpen,
  window: RectangleVertical,
  item: Sofa,
  zone: SquareDashed,
  slab: Square,
  ceiling: Layers2,
  stair: Triangle,
  'stair-segment': Triangle,
  shelf: Library,
  cabinet: Archive,
  'cabinet-module': Archive,
}

/** Propiedades del elemento elegido (modo Editar). Con nada elegido, o con un elemento que ya no existe, no se dibuja. */
export function PropertiesPanel() {
  const bridge = useBridge()
  const target = useShell(selectEditTarget)
  // Id del elemento al que se le pidió borrar y está esperando confirmación (solo si tiene cosas colgando).
  const [confirming, setConfirming] = useState<string | null>(null)
  if (!target) return null
  const { node } = target
  const copy = duplicatePatch(target)
  return (
    <PropertiesCard
      key={node.id}
      title={titleFor(target)}
      subtitle={subtitleFor(target)}
      icon={ICONS[node.type] ?? Box}
      fields={fieldsFor(target)}
      onCommit={(fieldId, raw) => {
        const patch = patchFor(target, fieldId, raw)
        if (patch) bridge.commit(node.id, patch)
      }}
      onClose={bridge.clearSelection}
      onDuplicate={copy ? () => bridge.duplicate(node.id, copy) : undefined}
      onDelete={() => {
        if (deleteWarning(target)) setConfirming(node.id)
        else bridge.remove(node.id)
      }}
      confirmMessage={confirming === node.id ? deleteWarning(target) : null}
      onConfirmDelete={() => {
        setConfirming(null)
        bridge.remove(node.id)
      }}
      onCancelDelete={() => setConfirming(null)}
    />
  )
}
