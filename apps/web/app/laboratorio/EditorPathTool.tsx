'use client'

import { Wrench } from 'lucide-react'
import type { CreateFromTemplateResult } from '@/lib/templates/create-from-template'
import { LabNotice, type Notice, PendingActions } from './LabNotice'
import type { Busy } from './PhotoCard'

type Props = {
  busy: Busy
  notice: Notice | null
  pending: CreateFromTemplateResult | null
  onOpenLoft: () => void
  onRetry: () => void
}

/**
 * Herramienta de Victoria, a un costado: abre la plantilla Loft como proyecto nuevo por el mismo camino que usa el laboratorio
 * (cuenta, guardado y editor), sin pasar por el análisis. Si eso funciona, cualquier definición válida también.
 */
export function EditorPathTool({ busy, notice, pending, onOpenLoft, onRetry }: Props) {
  return (
    <details className="glass rounded-[20px] px-4 text-sm">
      <summary className="focus-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-xl font-medium text-ink-muted">
        <Wrench aria-hidden size={16} />
        Comprobar que el camino al editor funciona (sin análisis)
      </summary>
      <div className="flex flex-col items-start gap-3 pb-4 pt-1">
        <p className="m-0 max-w-[62ch] text-ink-muted">
          Abre la plantilla Loft como proyecto nuevo, por el mismo camino que usa el laboratorio (cuenta, guardado y editor). Si esto funciona,
          cualquier definición válida también.
        </p>
        <button className="btn glass" disabled={busy !== null} onClick={onOpenLoft} type="button">
          Abrir el Loft como prueba
        </button>
        <LabNotice notice={notice} place="tool" />
        <PendingActions disabled={busy !== null} notice={notice} onRetry={onRetry} pending={pending} place="tool" />
      </div>
    </details>
  )
}
