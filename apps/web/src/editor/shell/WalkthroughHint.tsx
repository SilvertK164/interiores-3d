'use client'

import { Footprints } from 'lucide-react'
import { cx } from '@/lib/cx'
import { FLOAT } from './ui/primitives'
import { useBridge } from './use-bridge'

/** Mientras se recorre el proyecto no se ve nada del shell salvo cómo volver: Esc, o el botón si el cursor está libre. */
export function WalkthroughHint() {
  const bridge = useBridge()
  return (
    <div
      role="status"
      className={cx(FLOAT, 'absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full py-2 pl-5 pr-2')}
    >
      <Footprints aria-hidden="true" className="size-5 text-ink-muted" strokeWidth={1.9} />
      <span className="text-[15px] font-medium text-ink">Recorriendo el proyecto. Pulsa Esc para volver.</span>
      <button
        type="button"
        onClick={bridge.stopWalkthrough}
        className="focus-ring h-11 cursor-pointer rounded-full bg-ink px-5 text-[15px] font-semibold text-white"
      >
        Salir
      </button>
    </div>
  )
}
