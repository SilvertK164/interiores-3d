'use client'

import { Info, ScanSearch, Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'
import { Loader } from '@/components/Loader'
import { ANALYSIS_TEXT } from '@/lib/lab/analysis-text'
import type { CreateFromTemplateResult } from '@/lib/templates/create-from-template'
import { LabNotice, type Notice, PendingActions } from './LabNotice'
import { ExamplePhoto } from './ExamplePhoto'
import { PhotoDropzone } from './PhotoDropzone'

export type Busy = 'analizando' | 'abriendo' | null

type Props = {
  file: File | null
  onFile: (file: File | null) => void
  widthText: string
  onWidth: (text: string) => void
  busy: Busy
  notice: Notice | null
  pending: CreateFromTemplateResult | null
  onSubmit: (event: FormEvent) => void
  onExample: () => void
  /** El ejemplo está cargado: se muestra su foto en lugar de la zona para subir la propia. */
  fromExample: boolean
  /** Quita el ejemplo para volver a pedir la foto de la persona. */
  onLeaveExample: () => void
  onRetry: () => void
}

const CARD = 'glass flex flex-col gap-4 rounded-[28px] p-5 sm:p-6'

/** Primera tarjeta: la foto (con vista previa; con el ejemplo, la foto de ejemplo), el ancho conocido del muro del fondo, el aviso de privacidad y los dos botones de análisis. */
export function PhotoCard({ file, onFile, widthText, onWidth, busy, notice, pending, onSubmit, onExample, fromExample, onLeaveExample, onRetry }: Props) {
  const analyzing = busy === 'analizando'
  return (
    <form aria-labelledby="tu-foto" className={CARD} onSubmit={onSubmit}>
      <h2 className="font-display text-[19px] font-bold tracking-[-0.02em]" id="tu-foto">
        Tu foto
      </h2>
      {fromExample ? <ExamplePhoto disabled={busy !== null} onUseOwn={onLeaveExample} /> : <PhotoDropzone disabled={busy !== null} file={file} onFile={onFile} />}

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Ancho conocido del ambiente, en metros (opcional)
        <input
          autoComplete="off"
          className="field"
          disabled={busy !== null}
          inputMode="decimal"
          onChange={(event) => onWidth(event.target.value)}
          placeholder="4,5"
          value={widthText}
        />
        <span className="text-[13px] font-normal text-ink-muted">Si lo sabes, mide el muro del fondo (el que ves de frente) de lado a lado: así las medidas salen más precisas.</span>
      </label>

      <p className="m-0 flex items-start gap-2 text-[13px] leading-snug text-ink-muted">
        <Info aria-hidden className="mt-px shrink-0" size={16} />
        <span>{ANALYSIS_TEXT.privacy}</span>
      </p>

      <div className="flex flex-col gap-3">
        <button aria-busy={analyzing || undefined} className="btn btn-primary w-full" disabled={busy !== null} type="submit">
          <ScanSearch aria-hidden size={20} />
          Analizar foto
        </button>
        <button className="btn glass w-full" disabled={busy !== null} onClick={onExample} type="button">
          <Sparkles aria-hidden size={20} />
          Probar con un ejemplo
        </button>
        {analyzing && <Loader inline label="Analizando tu foto…" size="sm" />}
      </div>
      <p className="m-0 text-[13px] text-ink-muted">{ANALYSIS_TEXT.limit}</p>

      <LabNotice notice={notice} place="form" />
      <PendingActions disabled={busy !== null} notice={notice} onRetry={onRetry} pending={pending} place="form" />
    </form>
  )
}
