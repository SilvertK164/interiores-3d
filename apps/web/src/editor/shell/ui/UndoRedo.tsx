import { Redo2, Undo2 } from 'lucide-react'
import { cx } from '@/lib/cx'
import { FLOAT } from './primitives'

/** Deshacer y Rehacer. Cada uno se deshabilita solo cuando no hay nada que deshacer o rehacer. */
export function UndoRedo({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  className?: string
}) {
  const base =
    'focus-ring grid size-11 cursor-pointer place-items-center rounded-full text-ink transition-colors duration-150 ease-out hover:bg-ink/6 disabled:cursor-not-allowed disabled:text-ink/30 disabled:hover:bg-transparent'
  return (
    <fieldset className={cx(FLOAT, 'm-0 flex h-14 min-w-0 items-center gap-1 rounded-full border-0 p-1.5', className)}>
      <legend className="sr-only">Historial</legend>
      <button type="button" aria-label="Deshacer" disabled={!canUndo} onClick={onUndo} className={base}>
        <Undo2 aria-hidden="true" className="size-5" strokeWidth={2} />
      </button>
      <button type="button" aria-label="Rehacer" disabled={!canRedo} onClick={onRedo} className={base}>
        <Redo2 aria-hidden="true" className="size-5" strokeWidth={2} />
      </button>
    </fieldset>
  )
}
