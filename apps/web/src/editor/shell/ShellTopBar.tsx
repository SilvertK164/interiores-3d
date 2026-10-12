'use client'

import type { SaverStatus } from '../scene-saver'
import { ModeSwitch } from './ModeSwitch'
import { saveStateOf } from './save-state'
import { TopBar } from './ui/TopBar'
import { ViewSwitch } from './ViewSwitch'

export function ShellTopBar({
  name,
  saveStatus,
  onBack,
  backBusy,
}: {
  name: string
  saveStatus: SaverStatus
  onBack: () => void
  backBusy?: boolean
}) {
  return (
    <TopBar
      name={name}
      saveState={saveStateOf(saveStatus)}
      onBack={onBack}
      backBusy={backBusy}
      center={<ModeSwitch />}
      right={<ViewSwitch />}
    />
  )
}
