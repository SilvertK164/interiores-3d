'use client'

import { FileDown, X } from 'lucide-react'
import { type RefObject, useEffect, useId, useReducer, useRef } from 'react'
import { Loader } from '@/components/Loader'
import { abortable } from '@/lib/export/abortable'
import { EXPORT_DECISIONS } from '@/lib/export/decisions'
import { exportFileName } from '@/lib/export/file-name'
import { TEXT, generatingText, previewCaption } from '@/lib/export/texts-es'
import { downloadBlob } from './download-blob'
import type { IsoImage, PlanBuildArgs } from '@/lib/export/types'
import { captureIsoImages } from './capture-iso-images'
import { buildArgs, currentSheet, exportReducer, fitInfo, initialState, pageCount, previewArgs, scaleOptions, selectedLevels, suggestedOrientation } from './export-plan-model'
import { PlanOptions } from './ui/PlanOptions'
import { PlanPreview } from './ui/PlanPreview'
import { useBridge } from './use-bridge'
import { usePlanPreview } from './use-plan-preview'

type Props = {
  open: boolean
  projectName: string
  /** Nombre de la cuenta (o el correo si no tiene nombre). */
  author: string
  /** El botón que abrió el diálogo: el foco vuelve ahí al cerrar. */
  opener: RefObject<HTMLElement | null>
  onClose: () => void
}

/**
 * "Exportar plano": opciones a la izquierda, la hoja real a la derecha y Cancelar / Descargar PDF abajo. Habla con Pascal solo por
 * `bridge.plan`. Esc cancela la generación en curso (y si no hay, cierra); el estado vive en `export-plan-model`.
 */
export function ExportPlanDialog({ open, projectName, author, opener, onClose }: Props) {
  const bridge = useBridge()
  const ids = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previous = useRef<HTMLElement | null>(null)
  const controller = useRef<AbortController | null>(null)
  const busy = useRef(false)
  const focusedFirst = useRef(false)
  const [state, dispatch] = useReducer(exportReducer, initialState)
  // Las fotos isométricas de la vista previa, por planta y modo: se toman una vez y se reutilizan al paginar.
  const isoCache = useRef(new Map<string, IsoImage>())
  const metaNow = () => ({ projectName, author, date: new Date() })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      focusedFirst.current = false
      dispatch({ type: 'open' })
      isoCache.current.clear()
      dialog.showModal()
      let alive = true
      bridge.plan
        .measureLevels()
        .then((levels) => alive && dispatch({ type: 'measured', levels }))
        .catch(() => alive && dispatch({ type: 'measureFailed' }))
      return () => {
        alive = false
      }
    }
    if (!open && dialog.open) dialog.close()
  }, [open, bridge])

  // Cuando termina de medir, el foco pasa al primer control (hasta entonces queda en "Cerrar").
  useEffect(() => {
    if (!open || state.status !== 'ready' || focusedFirst.current) return
    focusedFirst.current = true
    dialogRef.current?.querySelector<HTMLElement>('fieldset input:not(:disabled)')?.focus()
  }, [open, state.status])

  const info = fitInfo(state)
  const sheet = currentSheet(state)
  const chosen = selectedLevels(state)
  const buildPreview = async (args: PlanBuildArgs) => {
    if (!args.isoPreview) return bridge.plan.build(args)
    const levelId = args.levelIds[0] as string
    const key = `${levelId}|${args.mode}`
    let image = isoCache.current.get(key)
    if (!image) {
      image = (await captureIsoImages(bridge, [levelId], args.mode))[0] as IsoImage
      isoCache.current.set(key, image)
    }
    return bridge.plan.build({ ...args, isoImages: [image] })
  }
  const preview = usePlanPreview(
    open && state.status === 'ready' && info.problem === null && chosen.length > 0 ? previewArgs(state, metaNow()) : null,
    buildPreview,
    EXPORT_DECISIONS.previewDelayMs,
  )

  const generate = async () => {
    if (busy.current || !info.canDownload) return
    busy.current = true
    const abort = new AbortController()
    controller.current = abort
    dispatch({ type: 'generate' })
    try {
      // Pascal solo mira la señal entre una imagen y la siguiente: cancelar responde ya y la generación se corta sola después.
      const args = buildArgs(state, metaNow())
      // Las fotos isométricas (una por planta, en el estilo del modo) se toman antes de armar el PDF.
      const isoImages = args.isometric ? await captureIsoImages(bridge, args.levelIds, args.mode) : []
      const result = await abortable(
        bridge.plan.build({
          ...args,
          isoImages,
          onProgress: (value) => !abort.signal.aborted && dispatch({ type: 'progress', value }),
          signal: abort.signal,
        }),
        abort.signal,
      )
      downloadBlob(result.blob, exportFileName(projectName))
      dispatch({ type: 'done', skippedImages: result.skippedImages })
    } catch (error) {
      const aborted = abort.signal.aborted || (error instanceof Error && error.name === 'AbortError')
      dispatch({ type: aborted ? 'cancelled' : 'failed' })
    } finally {
      busy.current = false
      controller.current = null
    }
  }

  /** Cancelar: si se está generando, corta la generación; si no, cierra el diálogo. */
  const cancelOrClose = () => {
    if (busy.current) controller.current?.abort()
    else dialogRef.current?.close()
  }

  const generating = state.status === 'generating'
  const total = state.progress?.total ?? chosen.length
  const pages = pageCount(state)
  const isoView = state.form.isometric && state.previewIndex >= chosen.length
  const current = chosen[isoView ? state.previewIndex - chosen.length : state.previewIndex]
  const caption = previewCaption(state.form.paper, state.form.orientation, sheet.widthMm, sheet.heightMm, isoView ? null : state.form.scale)

  return (
    <dialog
      aria-describedby={`${ids}-description`}
      aria-labelledby={`${ids}-title`}
      className="app-dialog pointer-events-auto max-[820px]:h-[calc(100dvh-2rem)]"
      onCancel={(event) => {
        event.preventDefault()
        cancelOrClose()
      }}
      onClose={() => {
        controller.current?.abort()
        ;(opener.current ?? previous.current)?.focus()
        onClose()
      }}
      onKeyDown={(event) => {
        // Pascal también escucha Esc en la ventana: se frena aquí para que no desarme la herramienta.
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        cancelOrClose()
      }}
      ref={dialogRef}
    >
      <div className="flex max-h-[inherit] flex-col gap-4 p-6 max-[820px]:h-full">
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

        {state.status === 'idle' || state.status === 'measuring' ? (
          <div className="grid min-h-48 place-items-center">
            <Loader label={TEXT.measuring} size="md" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto min-[820px]:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
            <div className="order-last min-w-0 min-[820px]:order-none">
              <PlanOptions
                busy={generating}
                levels={state.levels.map((level) => ({ id: level.id, label: level.label, empty: level.empty, checked: state.form.checked.includes(level.id) }))}
                mode={state.form.mode}
                onMode={(value) => dispatch({ type: 'mode', value })}
                onOrientation={(value) => dispatch({ type: 'orientation', value })}
                onPaper={(value) => dispatch({ type: 'paper', value })}
                onScale={(value) => dispatch({ type: 'scale', value })}
                isometric={state.form.isometric}
                onIsometric={(value) => dispatch({ type: 'isometric', value })}
                onTitleBlock={(value) => dispatch({ type: 'titleBlock', value })}
                onToggleLevel={(id) => dispatch({ type: 'toggleLevel', id })}
                orientation={state.form.orientation}
                paper={state.form.paper}
                scale={state.form.scale}
                scales={scaleOptions(state).map(({ scale, enabled, reason }) => ({ scale, enabled, reason }))}
                suggestedOrientation={suggestedOrientation(state)}
                titleBlock={state.form.titleBlock}
              />
            </div>
            <PlanPreview
              alt={`${TEXT.previewAlt}. ${caption}`}
              blob={preview.blob}
              caption={caption}
              heightMm={sheet.heightMm}
              message={info.summary}
              messageTone={info.problem === null ? 'ok' : 'problem'}
              mode={EXPORT_DECISIONS.previewMode}
              page={isoView ? 2 : 1}
              pager={
                pages > 1 && current
                  ? { label: isoView ? `${current.label} · ${TEXT.pdf.isometricSuffix}` : current.label, index: state.previewIndex, total: pages, onPrev: () => dispatch({ type: 'previewLevel', index: state.previewIndex - 1 }), onNext: () => dispatch({ type: 'previewLevel', index: state.previewIndex + 1 }) }
                  : null
              }
              status={preview.status}
              widthMm={sheet.widthMm}
            />
          </div>
        )}

        {state.message && (
          <p className={state.messageKind === 'error' ? 'text-sm text-destructive' : 'text-sm text-ink-muted'} role={state.messageKind === 'error' ? 'alert' : 'status'}>
            {state.message}
          </p>
        )}

        <footer className="flex flex-wrap items-center justify-end gap-3">
          {generating && <Loader inline label={generatingText(Math.min((state.progress?.done ?? 0) + 1, total), total)} size="sm" />}
          <button className="btn btn-ghost focus-ring" onClick={cancelOrClose} type="button">
            {TEXT.cancel}
          </button>
          {/* Mientras genera no se deshabilita: un botón deshabilitado suelta el foco y Esc dejaría de llegar al diálogo (generate ya ignora el segundo clic). */}
          <button
            aria-busy={generating}
            aria-disabled={generating || !info.canDownload}
            className="btn btn-primary focus-ring aria-disabled:cursor-progress aria-disabled:opacity-70"
            disabled={!generating && !info.canDownload}
            onClick={generate}
            type="button"
          >
            <FileDown aria-hidden="true" className="size-[18px]" strokeWidth={2} />
            {TEXT.download}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
