import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Pencil, Ruler, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cx } from '@/lib/cx'
import { formatMeters } from '@/lib/format'
import { LEVEL_NAME_MAX } from '../bridge/level-manage'
import { deleteBlockedReason, deleteSummary, heightHint } from '../level-manage-model'

export type LevelManageInfo = {
  height: number
  zones: number
  elements: number
  canDelete: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}

export type LevelManageActions = {
  onRename: (id: string, name: string) => boolean
  onHeight: (id: string, raw: string) => boolean
  onMove: (id: string, direction: 'up' | 'down') => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

type Mode = 'menu' | 'rename' | 'height' | 'delete'

const ROW = 'focus-ring flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-[15px] text-ink transition-colors duration-150 ease-out hover:bg-ink/5 disabled:cursor-default disabled:text-ink/40 disabled:hover:bg-transparent'
const INPUT = 'focus-ring h-11 w-full rounded-xl bg-ink/5 px-3 text-[15px] text-ink outline-none'
const BUTTON = 'focus-ring h-11 cursor-pointer rounded-xl px-4 text-[15px] font-semibold transition-colors duration-150 ease-out'

/** El botón "…" de una planta del selector. */
export function LevelMenuButton({ name, open, onToggle }: { name: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label="Opciones de la planta"
      aria-expanded={open}
      title={`Opciones de ${name}`}
      onClick={onToggle}
      className="focus-ring flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink-muted transition-colors duration-150 ease-out hover:bg-ink/5 hover:text-ink"
    >
      <MoreHorizontal aria-hidden="true" className="size-[18px]" strokeWidth={2} />
    </button>
  )
}

/** Opciones de una planta: renombrar, altura, orden, duplicar y eliminar (con confirmación que dice qué se pierde). */
export function LevelManage({
  id,
  name,
  info,
  actions,
  notice,
  onClose,
}: {
  id: string
  name: string
  info: LevelManageInfo
  actions: LevelManageActions
  notice: string | null
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>('menu')
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (mode === 'rename' || mode === 'height') input.current?.select()
  }, [mode])

  const back = () => {
    setError(null)
    setMode('menu')
  }
  const onKey = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    if (mode === 'menu') onClose()
    else back()
  }
  const commit = () => {
    const raw = input.current?.value ?? ''
    if (mode === 'rename') {
      if (raw.trim() === '') return setError('El nombre no puede quedar vacío.')
      actions.onRename(id, raw)
      onClose()
    } else {
      if (!actions.onHeight(id, raw)) {
        // Igual a la actual: no hay nada que guardar; algo que no es un número: se avisa.
        if (!/^\s*\d+([.,]\d+)?\s*(m|mts?)?\s*$/i.test(raw)) return setError('Escribe la altura en metros, por ejemplo 3,2.')
      }
      onClose()
    }
  }

  return (
    <fieldset onKeyDown={onKey} className="mx-0 mb-1 mt-0.5 min-w-0 rounded-xl border-0 bg-ink/[0.03] p-1.5">
      <legend className="sr-only">Opciones de {name}</legend>
      {mode === 'menu' && (
        <div className="flex flex-col gap-0.5">
          <button type="button" className={ROW} onClick={() => setMode('rename')}>
            <Pencil aria-hidden="true" className="size-[18px] text-ink-muted" strokeWidth={2} />
            Renombrar
          </button>
          <button type="button" className={ROW} onClick={() => setMode('height')}>
            <Ruler aria-hidden="true" className="size-[18px] text-ink-muted" strokeWidth={2} />
            <span className="flex-1">Altura</span>
            <span className="text-[13px] tabular-nums text-ink-muted">{formatMeters(info.height)}</span>
          </button>
          <button type="button" className={ROW} disabled={!info.canMoveUp} onClick={() => actions.onMove(id, 'up')}>
            <ArrowUp aria-hidden="true" className="size-[18px] text-ink-muted" strokeWidth={2} />
            Subir de orden
          </button>
          <button type="button" className={ROW} disabled={!info.canMoveDown} onClick={() => actions.onMove(id, 'down')}>
            <ArrowDown aria-hidden="true" className="size-[18px] text-ink-muted" strokeWidth={2} />
            Bajar de orden
          </button>
          <button
            type="button"
            className={ROW}
            onClick={() => {
              actions.onDuplicate(id)
              onClose()
            }}
          >
            <Copy aria-hidden="true" className="size-[18px] text-ink-muted" strokeWidth={2} />
            Duplicar
          </button>
          <button type="button" className={cx(ROW, 'text-danger-ink')} onClick={() => setMode('delete')}>
            <Trash2 aria-hidden="true" className="size-[18px]" strokeWidth={2} />
            Eliminar…
          </button>
          {notice && (
            <p role="status" className="px-3 pb-1 pt-1 text-[13px] leading-snug text-ink-muted">
              {notice}
            </p>
          )}
        </div>
      )}
      {(mode === 'rename' || mode === 'height') && (
        <form
          className="flex flex-col gap-2 p-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            commit()
          }}
        >
          <label className="text-[13px] font-semibold text-ink">
            {mode === 'rename' ? 'Nombre de la planta' : 'Altura (m)'}
            <input
              ref={input}
              // biome-ignore lint/a11y/noAutofocus: el campo aparece al elegir la acción; el foco debe ir directo a escribir.
              autoFocus
              className={cx(INPUT, 'mt-1 font-normal')}
              defaultValue={mode === 'rename' ? name : formatMeters(info.height).replace(/\s*m$/, '')}
              maxLength={mode === 'rename' ? LEVEL_NAME_MAX : 8}
              inputMode={mode === 'height' ? 'decimal' : 'text'}
              aria-invalid={error ? true : undefined}
              onChange={() => setError(null)}
            />
          </label>
          {mode === 'height' && <p className="text-[12px] text-ink-muted">{heightHint()}. Las escaleras y los cielorrasos se ajustan solos.</p>}
          {error && (
            <p role="alert" className="text-[13px] text-danger-ink">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className={cx(BUTTON, 'flex-1 bg-ink text-white')}>
              Guardar
            </button>
            <button type="button" className={cx(BUTTON, 'bg-ink/5 text-ink')} onClick={back}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {mode === 'delete' && (
        <div className="flex flex-col gap-2 p-1.5">
          <p className="text-[15px] font-semibold text-ink">¿Eliminar {name}?</p>
          <p className="text-[14px] leading-snug text-ink">{deleteSummary(info.zones, info.elements)}</p>
          <p className="text-[13px] leading-snug text-ink-muted">Podrás recuperarla con Deshacer.</p>
          {deleteBlockedReason(info.canDelete) && (
            <p role="status" className="text-[13px] text-danger-ink">
              {deleteBlockedReason(info.canDelete)}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!info.canDelete}
              onClick={() => {
                actions.onDelete(id)
                onClose()
              }}
              className={cx(BUTTON, 'flex-1 bg-danger text-white disabled:cursor-not-allowed disabled:opacity-40')}
            >
              Eliminar planta
            </button>
            <button type="button" className={cx(BUTTON, 'bg-ink/5 text-ink')} onClick={back}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </fieldset>
  )
}
