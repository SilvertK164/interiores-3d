'use client'

import { ArrowRight, Braces, Sofa } from 'lucide-react'
import { Loader } from '@/components/Loader'
import { ScenePlanPreview } from '@/components/ScenePlanPreview'
import type { AnalysisCandidate } from '@/lib/lab/analysis-catalog'
import { cameraText, openingsText, originText, pieceCountLabel, roomText } from '@/lib/lab/lab-view'
import type { PhotoScene } from '@/lib/lab/photo-scene'
import type { RoomAnalysis } from '@/lib/lab/schema'
import type { CreateFromTemplateResult } from '@/lib/templates/create-from-template'
import { LabNotice, type Notice, PendingActions } from './LabNotice'
import type { Busy } from './PhotoCard'
import { PiecesTable } from './PiecesTable'
import { WarningList } from './WarningList'

type Props = {
  analysis: RoomAnalysis | null
  candidates: readonly AnalysisCandidate[]
  fromExample: boolean
  /** La escena que sale del análisis: su vista previa desde arriba y lo que el acomodador y `analysisToDefinition` corrigieron o dejaron afuera (piezas fuera del ambiente, solapadas, sin catálogo o de confianza baja). */
  scene: PhotoScene | null
  busy: Busy
  notice: Notice | null
  pending: CreateFromTemplateResult | null
  onOpen: () => void
  onRetry: () => void
}

const CARD = 'glass @container flex min-w-0 flex-col gap-4 rounded-[28px] p-5 sm:p-6'

/**
 * Segunda tarjeta: la revisión antes de crear. Lo que encontró el análisis (el ambiente en metros, desde dónde se tomó la foto, avisos y tabla de
 * piezas), la vista previa de la escena desde arriba y, al final, «Crear escena y abrir en el editor». Antes del análisis es una invitación.
 */
export function ResultsCard({ analysis, candidates, fromExample, scene, busy, notice, pending, onOpen, onRetry }: Props) {
  return (
    <section aria-labelledby="resultado" className={CARD}>
      <h2 className="font-display text-[19px] font-bold tracking-[-0.02em]" id="resultado">
        {analysis ? 'Revisa la escena antes de crearla' : 'Resultado'}
      </h2>
      {analysis ? (
        <>
          <div className="grid items-start gap-4 @lg:grid-cols-[1.15fr_1fr]">
            {scene && <ScenePlanPreview plan={scene.plan} />}
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-col gap-1 text-sm">
                <p className="m-0 text-ink-muted">{originText(fromExample)}</p>
                <p className="m-0 font-medium" data-testid="room-summary">
                  {roomText(analysis.room)}
                </p>
                <p className="m-0 text-ink-muted">{cameraText(analysis.camera)}</p>
                <p className="m-0 text-ink-muted">{openingsText(analysis.openings)}</p>
              </div>
              <WarningList title="Avisos del análisis" warnings={analysis.warnings} />
              <WarningList title="Avisos del modelado" warnings={scene?.warnings ?? []} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-[15px] font-semibold">Muebles encontrados</h3>
            <span className="chip bg-brand-wash text-brand-deep">{pieceCountLabel(analysis.furniture.length)}</span>
          </div>
          <PiecesTable candidates={candidates} furniture={analysis.furniture} />
          <details className="rounded-[20px] bg-white/50 px-4 text-sm">
            <summary className="focus-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-xl font-medium text-ink-muted">
              <Braces aria-hidden size={16} />
              Ver la respuesta completa (JSON)
            </summary>
            <pre className="mb-3 mt-1 max-h-72 overflow-auto text-xs" data-testid="raw-json">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </details>
          <div className="flex flex-col items-start gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary" disabled={busy !== null} onClick={onOpen} type="button">
                <ArrowRight aria-hidden size={20} />
                Crear escena y abrir en el editor
              </button>
              {busy === 'abriendo' && <Loader inline label="Abriendo el editor…" size="sm" />}
            </div>
            <p className="m-0 text-[13px] text-ink-muted">Crea el proyecto «Desde una foto · fecha y hora» en tu cuenta y lo abre en el editor.</p>
          </div>
        </>
      ) : (
        <div className="grid min-h-[220px] place-items-center rounded-[20px] bg-white/50 p-6 text-center">
          <div className="max-w-[34ch]">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-brand-wash text-brand-deep">
              <Sofa aria-hidden size={24} />
            </span>
            <p className="m-0 text-sm text-ink-muted">Aquí verás los muebles que reconocemos en tu foto, con qué seguridad y dónde van.</p>
          </div>
        </div>
      )}
      <LabNotice notice={notice} place="results" />
      <PendingActions disabled={busy !== null} notice={notice} onRetry={onRetry} pending={pending} place="results" />
    </section>
  )
}
