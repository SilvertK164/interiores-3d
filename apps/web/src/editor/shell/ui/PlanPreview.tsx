'use client'

import { Check, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Loader } from '@/components/Loader'
import { cx } from '@/lib/cx'
import { TEXT, levelPagerText } from '@/lib/export/texts-es'
import type { PreviewState } from '../use-plan-preview'
import { renderPdfPage } from './render-pdf-page'

export type PlanPreviewProps = PreviewState & {
  /** Medidas de la hoja en mm (la proporción del cuadro). */
  widthMm: number
  heightMm: number
  /** Texto alternativo del lienzo. */
  alt: string
  /** "Vista previa · A4 apaisada (297 × 210 mm) · 1:50". */
  caption: string
  mode: 'pdfjs' | 'frame'
  /** Página del PDF que se dibuja (2 en la vista previa de una hoja isométrica). */
  page?: number
  /** La cabida o el problema ("Cabe en la hoja · usa 64 % del ancho"). */
  message: string | null
  messageTone: 'ok' | 'problem'
  pager: { label: string; index: number; total: number; onPrev(): void; onNext(): void } | null
}

const PAGER_BUTTON =
  'focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-ink shadow-soft transition-colors duration-150 hover:bg-brand-wash disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none'

/** La columna derecha del diálogo: la hoja real (la página del PDF en un lienzo), el paginador y el mensaje de cabida. */
export function PlanPreview(props: PlanPreviewProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // La página que `pdfjs` no pudo dibujar: si cambia la página, se vuelve a intentar.
  const [failedFor, setFailedFor] = useState<Blob | null>(null)
  const failed = props.blob !== null && failedFor === props.blob
  const drawable = props.mode === 'pdfjs' && props.status !== 'unavailable' && !failed
  const ratio = props.widthMm / props.heightMm

  useEffect(() => {
    const el = canvas.current
    if (!drawable || props.status !== 'ready' || !props.blob || !el) return
    let cancelled = false
    let release: (() => void) | undefined
    renderPdfPage(props.blob, el, () => cancelled, props.page ?? 1)
      .then((stop) => {
        if (cancelled) stop()
        else release = stop
      })
      .catch(() => {
        if (!cancelled) setFailedFor(props.blob)
      })
    return () => {
      cancelled = true
      release?.()
    }
  }, [drawable, props.status, props.blob, props.page])

  const loading = props.status === 'loading'
  const showFrameNote = !drawable && props.status !== 'idle'
  return (
    <section aria-label={TEXT.previewLabel} className="flex min-w-0 flex-col gap-3 rounded-[24px] bg-brand-mist/70 p-4" aria-busy={loading}>
      <div className="relative mx-auto max-w-full" style={{ aspectRatio: `${props.widthMm} / ${props.heightMm}`, width: `min(100%, calc(42vh * ${ratio}))` }}>
        {props.status !== 'idle' && drawable && <canvas aria-label={props.alt} className="absolute inset-0 size-full rounded-[6px] bg-white shadow-soft" ref={canvas} role="img" />}
        {(props.status === 'idle' || showFrameNote) && <div aria-hidden="true" className="absolute inset-0 rounded-[6px] bg-white shadow-soft" />}
        {loading && !props.blob && (
          <div className="absolute inset-0 grid place-items-center">
            <Loader label={TEXT.updatingPreview} size="md" />
          </div>
        )}
        {showFrameNote && (
          <p className="absolute inset-0 grid place-items-center p-4 text-center text-[13px] text-ink-muted" role="status">
            {TEXT.previewUnavailable}
          </p>
        )}
      </div>

      {props.pager && (
        <div className="flex items-center justify-center gap-2">
          <button aria-label={TEXT.previousLevel} className={PAGER_BUTTON} disabled={props.pager.index <= 0} onClick={props.pager.onPrev} type="button">
            <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
          <span className="min-w-[8.5rem] text-center text-[14px] font-medium text-ink">{levelPagerText(props.pager.label, props.pager.index, props.pager.total)}</span>
          <button aria-label={TEXT.nextLevel} className={PAGER_BUTTON} disabled={props.pager.index >= props.pager.total - 1} onClick={props.pager.onNext} type="button">
            <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
        </div>
      )}

      {props.message && (
        <p
          className={cx(
            'mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold',
            props.messageTone === 'ok' ? 'bg-[#E1F5EB] text-ok' : 'bg-[#FFF1D6] text-sun-ink',
          )}
          role="status"
        >
          {props.messageTone === 'ok' ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : <TriangleAlert aria-hidden="true" className="size-4" strokeWidth={2.25} />}
          {props.message}
        </p>
      )}
      <p className="text-center text-[13px] text-ink-muted">{props.caption}</p>
    </section>
  )
}
