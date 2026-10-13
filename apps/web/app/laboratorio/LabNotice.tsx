import type { CreateFromTemplateResult } from '@/lib/templates/create-from-template'
import { BusyLink } from '@/components/BusyLink'

/** Dónde se muestra un aviso: junto al formulario, junto a los resultados o en la herramienta de prueba del camino al editor. */
export type NoticePlace = 'form' | 'results' | 'tool'
export type Notice = { text: string; place: NoticePlace }

/** El aviso de un paso (en rojo suave); no muestra nada si no es de su lugar. */
export function LabNotice({ notice, place }: { notice: Notice | null; place: NoticePlace }) {
  if (!notice || notice.place !== place) return null
  return (
    <p className="m-0 whitespace-pre-line rounded-[16px] bg-danger-wash px-4 py-3 text-sm text-danger-ink" role="alert">
      {notice.text}
    </p>
  )
}

type PendingProps = {
  pending: CreateFromTemplateResult | null
  place: NoticePlace
  /** El lugar del aviso actual: las acciones van con él. */
  notice: Notice | null
  disabled: boolean
  onRetry: () => void
}

/** El proyecto se creó pero la escena no se guardó: reintentar o abrir el proyecto vacío. */
export function PendingActions({ pending, notice, place, disabled, onRetry }: PendingProps) {
  if (!pending || notice?.place !== place) return null
  return (
    <div className="flex flex-wrap gap-3">
      <button className="btn btn-primary" disabled={disabled} onClick={onRetry} type="button">
        Reintentar guardar la escena
      </button>
      <BusyLink className="btn glass focus-ring" href={`/proyectos/${pending.project.id}`}>
        Abrir el proyecto vacío
      </BusyLink>
    </div>
  )
}
