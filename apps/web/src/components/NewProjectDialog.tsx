'use client'

import type { ProjectKind } from '@interiores/contract'
import { Check, House, Sparkles, SquareDashed, Store, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useRef } from 'react'
import { templatesForKind } from '@/lib/templates'
import { useNewProject } from '@/lib/use-new-project'
import { Logo } from './Logo'
import { TemplateFace } from './TemplateFace'

type Props = {
  open: boolean
  /** Plantilla que llega elegida desde el mosaico (cambia el tipo si hace falta). */
  presetTemplateId?: string | null
  onClose: () => void
  /** El proyecto se creó pero su plantilla no se guardó: la lista debe volver a pedirse. */
  onPartial?: () => void
}

const KINDS: { value: ProjectKind; label: string; hint: string; Icon: typeof House }[] = [
  { value: 'vivienda', label: 'Vivienda', hint: 'Departamentos, casas y lofts', Icon: House },
  { value: 'comercio', label: 'Comercio', hint: 'Tiendas, cafés y supermercados', Icon: Store },
]

const FOCUS =
  'has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/45'
const TILE = `group relative isolate block aspect-[4/3] cursor-pointer overflow-hidden rounded-[20px] shadow-soft transition-shadow duration-200 ease-out has-[:checked]:shadow-[0_0_0_4px_var(--color-brand),0_14px_30px_rgb(31_95_224/0.3)] ${FOCUS}`
const LABEL = 'mb-1.5 ml-1.5 block text-[13px] text-ink-muted'

/** Diálogo accesible (`<dialog>` nativo): Esc cierra, el foco queda atrapado y vuelve a donde estaba. */
export function NewProjectDialog({ open, presetTemplateId, onClose, onPartial }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const ids = useId()
  const np = useNewProject(onPartial)
  const { reset } = np
  const locked = np.busy || np.pending !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      reset(presetTemplateId)
      dialog.showModal()
      nameRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, presetTemplateId, reset])

  const close = () => {
    if (!np.busy) onClose()
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noNoninteractiveElementInteractions: el clic en el fondo es un atajo; el teclado cierra con Esc (evento nativo cancel).
    <dialog
      aria-label="Nuevo proyecto"
      className="app-dialog"
      onCancel={(e) => {
        if (np.busy) e.preventDefault()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      onClose={() => {
        returnFocus.current?.focus()
        onClose()
      }}
      ref={dialogRef}
    >
      <form className="flex flex-col gap-4 px-7 pb-[22px] pt-[26px]" noValidate onSubmit={np.submit}>
        <header className="flex items-center gap-3">
          <Logo size={36} />
          <h2 className="text-2xl font-medium tracking-[-0.01em]">Nuevo proyecto</h2>
          <span className="flex-1" />
          <button
            aria-label="Cerrar"
            className="focus-ring grid size-10 cursor-pointer place-items-center rounded-full bg-ink/5 transition-colors duration-150 hover:bg-ink/10"
            onClick={close}
            type="button"
          >
            <X aria-hidden size={20} />
          </button>
        </header>

        <div>
          <label className={LABEL} htmlFor={`${ids}-name`}>
            Nombre del proyecto
          </label>
          <input
            aria-describedby={np.nameError ? `${ids}-name-error` : undefined}
            aria-invalid={np.nameError ? true : undefined}
            className="field"
            disabled={locked}
            id={`${ids}-name`}
            maxLength={80}
            onChange={(e) => np.setName(e.target.value)}
            placeholder="Mi tienda de barrio"
            ref={nameRef}
            value={np.name}
          />
          {np.nameError && (
            <p className="ml-1.5 mt-1.5 text-sm text-destructive" id={`${ids}-name-error`} role="alert">
              {np.nameError}
            </p>
          )}
        </div>

        <fieldset className="grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-2" disabled={locked}>
          <legend className="sr-only">Tipo de proyecto</legend>
          {KINDS.map(({ value, label, hint, Icon }) => (
            <label
              className={`group flex cursor-pointer items-center gap-3 rounded-[20px] bg-white px-4 py-3 shadow-soft transition-colors duration-200 has-[:checked]:bg-brand has-[:checked]:text-white ${FOCUS}`}
              key={value}
            >
              <input
                checked={np.kind === value}
                className="sr-only"
                name={`${ids}-tipo`}
                onChange={() => np.chooseKind(value)}
                type="radio"
                value={value}
              />
              <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-brand-mist text-brand group-has-[:checked]:bg-white/20 group-has-[:checked]:text-white">
                <Icon aria-hidden size={20} />
              </span>
              <span>
                <span className="block text-base font-medium">{label}</span>
                <span className="block text-[13px] text-ink-muted group-has-[:checked]:text-brand-wash">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset disabled={locked}>
          <legend className={LABEL}>Plantilla</legend>
          <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-4">
            {templatesForKind(np.kind).map((t) => (
              <label className={TILE} key={t.id}>
                <input
                  checked={np.templateId === t.id}
                  className="sr-only"
                  name={`${ids}-plantilla`}
                  onChange={() => np.setTemplateId(t.id)}
                  type="radio"
                />
                <TemplateFace selectable size="picker" template={t} />
              </label>
            ))}
            <label className={`${TILE} grid place-items-center bg-brand-mist text-center text-brand`}>
              <input
                checked={np.templateId === null}
                className="sr-only"
                name={`${ids}-plantilla`}
                onChange={() => np.setTemplateId(null)}
                type="radio"
              />
              <span
                aria-hidden
                className="absolute right-2.5 top-2.5 hidden size-7 place-items-center rounded-full bg-brand text-white group-has-[:checked]:grid"
              >
                <Check size={14} />
              </span>
              <span>
                <SquareDashed aria-hidden className="mx-auto" size={20} />
                <span className="block text-sm font-medium">En blanco</span>
                <span className="block text-xs text-ink-muted">Escena vacía</span>
              </span>
            </label>
          </div>
        </fieldset>

        {np.error && (
          <p className="text-sm text-destructive" role="alert">
            {np.error}
          </p>
        )}

        <footer className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm text-ink-muted">Podrás cambiar todo después.</span>
          <span className="flex-1" />
          <button className="btn btn-ghost" onClick={close} type="button">
            Cancelar
          </button>
          {np.pending ? (
            <>
              <Link className="btn btn-ghost" href={`/proyectos/${np.pending.project.id}`}>
                Abrir el proyecto vacío
              </Link>
              <button className="btn btn-primary" disabled={np.busy} onClick={np.retry} type="button">
                Reintentar guardar la plantilla
              </button>
            </>
          ) : (
            <button className="btn btn-primary" disabled={np.busy} type="submit">
              <Sparkles aria-hidden size={20} />
              Crear proyecto
            </button>
          )}
        </footer>
      </form>
    </dialog>
  )
}
