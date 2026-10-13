'use client'

import { Info, Plus, ScanSearch, Sparkles, X } from 'lucide-react'
import { type RefObject, useEffect, useId, useMemo, useReducer, useRef } from 'react'
import { Loader } from '@/components/Loader'
import { cx } from '@/lib/cx'
import { api } from '@/lib/api/instance'
import { buildAnalysisCatalog } from '@/lib/lab/analysis-catalog'
import { describeLabError } from '@/lib/lab/describe-error'
import { parseKnownWidth } from '@/lib/lab/form-helpers'
import { LabError } from '@/lib/lab/lab-error'
import { SAMPLE_ANALYSIS } from '@/lib/lab/sample-analysis'
import type { CatalogItemLike } from './furniture-model'
import { TEXT, canAdd, canAnalyze, checkedRows, detectedRows, initialState, photoReducer, selectionSummary } from './photo-furniture-model'
import { CHECK_ROW } from './ui/PlanOptions'
import { useBridge } from './use-bridge'

type Props = {
  open: boolean
  /** Las piezas del catálogo local (con sus rutas locales): de ahí salen las que se le ofrecen al análisis y lo que se agrega. */
  catalog: readonly CatalogItemLike[]
  /** El botón que abrió el diálogo: el foco vuelve ahí al cerrar. */
  opener: RefObject<HTMLElement | null>
  onClose: () => void
}

const LABEL = 'flex flex-col gap-1.5 text-[14px] font-medium text-ink'
const HINT = 'text-[12px] font-normal leading-snug text-ink-muted'

/**
 * «Muebles desde una foto»: la persona sube la foto de un ambiente, el análisis (`api.analyzeRoom`) propone qué muebles del catálogo hay y dónde, y «Agregar
 * al proyecto» los inserta en la planta activa en un solo paso del historial, todos seleccionados juntos. Habla con Pascal solo
 * por `bridge.cluster`. Esc cierra; si el análisis contesta después de cerrar, la respuesta se ignora.
 */
export function PhotoFurnitureDialog({ open, catalog, opener, onClose }: Props) {
  const bridge = useBridge()
  const ids = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previous = useRef<HTMLElement | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  /** Cada análisis y cada cierre suben el número: una respuesta de un número viejo ya no cuenta. */
  const run = useRef(0)
  const busy = useRef(false)
  const [state, dispatch] = useReducer(photoReducer, undefined, initialState)
  const local = useMemo(() => buildAnalysisCatalog(catalog), [catalog])
  const analyzing = state.step === 'analyzing'
  const results = state.step === 'results'
  // Los avisos pueden repetirse: la clave lleva el lugar de cada uno.
  const warnings = state.warnings.map((text, index) => ({ text, key: `${index}-${text}` }))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dispatch({ type: 'open' })
      dialog.showModal()
      dialog.querySelector<HTMLElement>('input[type="file"]')?.focus()
    } else if (!open && dialog.open) dialog.close()
  }, [open])

  // Al llegar la lista, el foco pasa a su título (un lector de pantalla la anuncia); al volver, al campo de la foto.
  useEffect(() => {
    if (!open) return
    if (state.step === 'results') heading.current?.focus()
    else if (state.step === 'form') dialogRef.current?.querySelector<HTMLElement>('input[type="file"]')?.focus()
  }, [open, state.step])

  /** Un análisis fijo (sin Gemini, sin cuota): sirve para probar o mostrar el flujo si el servicio no responde. */
  const tryExample = () => {
    if (busy.current) return
    dispatch({ type: 'analyzed', ...detectedRows(SAMPLE_ANALYSIS, (id) => local.pieces.get(id)) })
  }

  const analyze = async () => {
    if (busy.current || !state.file) return
    busy.current = true
    const mine = ++run.current
    try {
      // El ancho escrito se revisa antes de esperar al análisis: uno inválido se avisa sin llamar a la red.
      const knownWidthM = parseKnownWidth(state.widthText)
      dispatch({ type: 'analyzing' })
      const analysis = await api.analyzeRoom(state.file, { knownWidthM, catalog: local.candidates })
      if (mine === run.current) dispatch({ type: 'analyzed', ...detectedRows(analysis, (id) => local.pieces.get(id)) })
    } catch (error) {
      if (!(error instanceof LabError)) console.error('[muebles desde una foto]', error)
      if (mine === run.current) dispatch({ type: 'failed', message: describeLabError(error) })
    } finally {
      if (mine === run.current) busy.current = false
    }
  }

  const add = () => {
    if (!canAdd(state)) return
    try {
      const created = bridge.cluster.insert(checkedRows(state).map(({ piece }) => piece))
      if (created.length > 0) dialogRef.current?.close()
      else dispatch({ type: 'failed', message: TEXT.addFailed, stay: true })
    } catch (error) {
      console.error('[muebles desde una foto]', error)
      dispatch({ type: 'failed', message: describeLabError(error), stay: true })
    }
  }

  const formId = `${ids}-form`
  return (
    <dialog
      aria-describedby={`${ids}-description`}
      aria-labelledby={`${ids}-title`}
      className="app-dialog pointer-events-auto max-w-[560px]"
      onCancel={(event) => {
        event.preventDefault()
        dialogRef.current?.close()
      }}
      onClose={() => {
        // Lo que el análisis conteste después ya no cuenta, y uno nuevo no espera al viejo.
        run.current++
        busy.current = false
        ;(opener.current ?? previous.current)?.focus()
        onClose()
      }}
      onKeyDown={(event) => {
        // Pascal también escucha Esc en la ventana: se frena aquí para que no desarme la herramienta.
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        dialogRef.current?.close()
      }}
      ref={dialogRef}
    >
      <div className="flex flex-col gap-4 p-6">
        <header className="flex items-start gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em]" id={`${ids}-title`}>
              {TEXT.title}
            </h2>
            <p className="text-[14px] text-ink-muted" id={`${ids}-description`}>
              {TEXT.subtitle}
            </p>
          </div>
          <span className="flex-1" />
          <button
            aria-label={TEXT.close}
            className="focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-ink/5 transition-colors duration-150 hover:bg-ink/10 motion-reduce:transition-none"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
        </header>

        {results ? (
          <section aria-labelledby={`${ids}-found`} className="flex flex-col gap-3">
            <div>
              <h3 className="text-[15px] font-semibold outline-none" id={`${ids}-found`} ref={heading} tabIndex={-1}>
                {TEXT.found}
              </h3>
              {state.rows.length > 0 && <p className={HINT}>{TEXT.foundHint}</p>}
            </div>
            {state.rows.length === 0 ? (
              <p className="text-[14px] text-ink-muted">{TEXT.empty}</p>
            ) : (
              <>
                <ul aria-labelledby={`${ids}-found`} className="m-0 flex max-h-[38dvh] list-none flex-col gap-2 overflow-y-auto p-0.5">
                  {state.rows.map((row) => (
                    <li key={row.key}>
                      <label className={cx(CHECK_ROW, 'rounded-full px-4')}>
                        <input checked={row.checked} className="size-5 shrink-0 accent-brand" onChange={() => dispatch({ type: 'toggle', key: row.key })} type="checkbox" />
                        <span className="flex-1 font-medium">{row.name}</span>
                        <span className="text-[13px] text-ink-muted">{Math.round(row.confidence * 100)} %</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p aria-live="polite" className="text-[13px] text-ink-muted">
                  {selectionSummary(state)}
                </p>
              </>
            )}
            {state.warnings.length > 0 && (
              <div className="rounded-[16px] bg-ink/5 px-4 py-3 text-[13px]">
                <h4 className="font-semibold">{TEXT.warnings}</h4>
                <ul className="m-0 list-disc pl-5">
                  {warnings.map(({ text, key }) => (
                    <li key={key}>{text}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ) : (
          <form
            className="flex flex-col gap-4"
            id={formId}
            onSubmit={(event) => {
              event.preventDefault()
              void analyze()
            }}
          >
            <label className={LABEL}>
              {TEXT.photo}
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-describedby={`${ids}-privacy`}
                className="focus-ring w-full cursor-pointer rounded-full bg-white/75 text-[14px] text-ink-muted shadow-[inset_0_0_0_1px_rgb(11_31_77/0.06)] file:mr-3 file:h-12 file:cursor-pointer file:border-0 file:bg-ink/6 file:px-5 file:text-[14px] file:font-medium file:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                disabled={analyzing}
                onChange={(event) => dispatch({ type: 'file', file: event.target.files?.[0] ?? null })}
                type="file"
              />
            </label>
            <label className={LABEL}>
              {TEXT.width}
              <input
                autoComplete="off"
                className="field"
                disabled={analyzing}
                inputMode="decimal"
                onChange={(event) => dispatch({ type: 'width', value: event.target.value })}
                placeholder={TEXT.widthPlaceholder}
                value={state.widthText}
              />
              <span className={HINT}>{TEXT.widthHint}</span>
            </label>
            <div className="flex flex-col gap-2">
              <p className="m-0 flex items-start gap-2 rounded-[16px] bg-ink/5 px-4 py-3 text-[12px] leading-snug text-ink-muted" id={`${ids}-privacy`}>
                <Info aria-hidden="true" className="mt-px size-4 shrink-0" strokeWidth={2} />
                <span>{TEXT.privacy}</span>
              </p>
              <p className={`m-0 ${HINT}`}>{TEXT.limit}</p>
            </div>
          </form>
        )}

        {state.error && (
          <p className="whitespace-pre-line text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <footer className="flex flex-wrap items-center justify-end gap-3">
          {analyzing && <Loader inline label={TEXT.analyzing} size="sm" />}
          {results ? (
            <>
              <button className="btn btn-ghost focus-ring" onClick={() => dispatch({ type: 'back' })} type="button">
                {TEXT.back}
              </button>
              <button className="btn btn-primary focus-ring" disabled={!canAdd(state)} onClick={add} type="button">
                <Plus aria-hidden="true" className="size-[18px]" strokeWidth={2} />
                {TEXT.add}
              </button>
            </>
          ) : (
            <>
            <button className="btn btn-ghost focus-ring" disabled={analyzing} onClick={tryExample} type="button">
              <Sparkles aria-hidden="true" className="size-[18px]" strokeWidth={2} />
              {TEXT.example}
            </button>
            {/* Mientras analiza no se deshabilita: un botón deshabilitado suelta el foco (`analyze` ya ignora el segundo clic). */}
            <button
              aria-busy={analyzing}
              aria-disabled={analyzing}
              className="btn btn-primary focus-ring aria-disabled:cursor-progress aria-disabled:opacity-70"
              disabled={!analyzing && !canAnalyze(state)}
              form={formId}
              type="submit"
            >
              <ScanSearch aria-hidden="true" className="size-[18px]" strokeWidth={2} />
              {TEXT.analyze}
            </button>
            </>
          )}
        </footer>
      </div>
    </dialog>
  )
}
