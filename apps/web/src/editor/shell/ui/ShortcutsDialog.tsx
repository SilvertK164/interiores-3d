'use client'

import { Fragment, useEffect, useRef } from 'react'

/** Atajos de teclado en un diálogo nativo (`<dialog>`): Esc cierra, el foco queda atrapado y "Cerrar" usa `method="dialog"`. */
export function ShortcutsDialog({
  open,
  shortcuts,
  onClose,
}: {
  open: boolean
  shortcuts: readonly { keys: string; label: string }[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog ref={ref} aria-label="Atajos de teclado" onClose={onClose} className="app-dialog max-w-[480px]">
      <form method="dialog" className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Atajos de teclado</h2>
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-[14px]">
          {shortcuts.map((s) => (
            <Fragment key={s.keys}>
              <dt>
                <kbd className="rounded-md bg-ink/6 px-2 py-0.5 font-sans text-[13px] font-semibold text-ink">{s.keys}</kbd>
              </dt>
              <dd className="text-ink-muted">{s.label}</dd>
            </Fragment>
          ))}
        </dl>
        <button type="submit" className="btn btn-primary focus-ring self-end">
          Cerrar
        </button>
      </form>
    </dialog>
  )
}
