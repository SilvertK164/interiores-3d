import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { FLOAT } from './primitives'
import { SaveChip, type SaveState } from './status'

/** Barra superior: volver + nombre + guardado | modo (centro) | vista (derecha). El contenedor deja pasar los clics al lienzo. */
export function TopBar({
  name,
  saveState,
  onBack,
  backBusy,
  center,
  right,
}: {
  name: string
  saveState: SaveState
  onBack: () => void
  backBusy?: boolean
  center: ReactNode
  right: ReactNode
}) {
  return (
    <header className="pointer-events-none absolute inset-x-5 top-5 z-20 grid grid-cols-[1fr_auto_1fr] items-start">
      <div
        className={cx(
          FLOAT,
          'flex h-14 w-fit max-w-full items-center gap-3 justify-self-start rounded-full py-1.5 pl-1.5 pr-4',
        )}
      >
        <button
          type="button"
          aria-label="Volver a mis proyectos"
          aria-busy={backBusy || undefined}
          disabled={backBusy}
          onClick={onBack}
          className="focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink transition-colors duration-150 ease-out hover:bg-ink/6 disabled:cursor-wait disabled:opacity-60"
        >
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
        <h1 className="min-w-0 truncate font-display text-[17px] font-semibold leading-none">{name}</h1>
        <SaveChip state={saveState} />
      </div>
      <div className="justify-self-center">{center}</div>
      <div className="justify-self-end">{right}</div>
    </header>
  )
}
