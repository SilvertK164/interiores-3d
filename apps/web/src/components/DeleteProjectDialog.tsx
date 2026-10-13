'use client'

import type { ProjectSummary } from '@interiores/contract'
import { Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api/instance'
import { createProjectDeleter, deleteQuestion } from '@/lib/delete-project'
import { Loader } from './Loader'

type Props = {
  /** El proyecto por eliminar; `null` = diálogo cerrado. */
  project: ProjectSummary | null
  onClose: () => void
  /** La API ya lo borró: la lista debe quitarlo. */
  onDeleted: (project: ProjectSummary) => void
}

/**
 * Confirmación de «Eliminar proyecto» (`<dialog>` nativo): el foco empieza en «Cancelar», Esc y el fondo cancelan, y mientras
 * borra no se puede cerrar ni repetir. Un error se muestra dentro y deja reintentar.
 */
export function DeleteProjectDialog({ project, onClose, onDeleted }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const ids = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deleter = useMemo(() => createProjectDeleter((id) => api.deleteProject(id)), [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (project && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setBusy(false)
      setError(null)
      dialog.showModal()
      cancelRef.current?.focus()
    } else if (!project && dialog.open) {
      dialog.close()
    }
  }, [project])

  const close = () => {
    if (!busy) onClose()
  }

  const confirm = async () => {
    if (!project) return
    setBusy(true)
    setError(null)
    const outcome = await deleter(project.id)
    if (outcome === null) return // otro clic ya lo está borrando
    if (outcome.ok) return onDeleted(project) // sigue «ocupado» hasta que el diálogo se cierra: no parpadea el botón
    setBusy(false)
    setError(outcome.message)
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: el clic en el fondo es un atajo; el teclado cierra con Esc (evento nativo cancel).
    <dialog
      aria-describedby={`${ids}-text`}
      aria-labelledby={`${ids}-title`}
      className="app-dialog max-w-[440px]"
      onCancel={(e) => {
        if (busy) e.preventDefault()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      onClose={() => {
        if (returnFocus.current?.isConnected) returnFocus.current.focus()
        onClose()
      }}
      ref={dialogRef}
    >
      <div className="flex flex-col gap-4 px-7 pb-[22px] pt-[26px]">
        <header className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-wash text-danger">
            <Trash2 aria-hidden size={20} />
          </span>
          <h2 className="font-display text-xl font-bold tracking-[-0.02em]" id={`${ids}-title`}>
            Eliminar proyecto
          </h2>
        </header>
        <p className="text-[15px] text-ink-muted" id={`${ids}-text`}>
          {project ? deleteQuestion(project.name) : ''}
        </p>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <footer className="flex flex-wrap justify-end gap-2.5">
          <button className="btn btn-ghost" disabled={busy} onClick={close} ref={cancelRef} type="button">
            Cancelar
          </button>
          <button aria-busy={busy || undefined} className="btn btn-danger" onClick={confirm} type="button">
            {busy ? (
              <>
                <span aria-hidden className="grid size-8 place-items-center rounded-full bg-white">
                  <Loader inline label="Eliminando" showLabel={false} size="sm" />
                </span>
                Eliminando…
              </>
            ) : (
              'Eliminar'
            )}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
