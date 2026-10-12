import { ChevronDown, Layers, Plus, SquareDashed } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import { FLOAT } from './primitives'

export type LevelOption = { id: string; name: string }
export type ZoneRow = { id: string; name: string; area: string }

/** Selector de planta: el botón muestra la activa; abierto lista todas y deja agregar una más. */
export function LevelPicker({
  levels,
  activeId,
  open,
  onToggle,
  onPick,
  onAdd,
  adding,
  canAdd = true,
}: {
  levels: readonly LevelOption[]
  activeId: string | null
  open: boolean
  onToggle: () => void
  onPick: (id: string) => void
  onAdd: () => void
  adding?: boolean
  canAdd?: boolean
}) {
  const active = levels.find((l) => l.id === activeId)
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="focus-ring flex h-12 w-full cursor-pointer items-center gap-2.5 rounded-2xl bg-ink/5 px-3.5 text-[15px] font-semibold text-ink transition-colors duration-150 ease-out hover:bg-ink/8"
      >
        <Layers aria-hidden="true" className="size-[18px] text-ink-muted" strokeWidth={2} />
        <span className="flex-1 truncate text-left">{active?.name ?? (levels.length > 0 ? 'Elige una planta' : 'Sin plantas')}</span>
        <ChevronDown
          aria-hidden="true"
          className={cx('size-[18px] text-ink-muted transition-transform', open && 'rotate-180')}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className={cx(FLOAT, 'absolute inset-x-0 top-full z-20 mt-2 rounded-2xl p-1.5')}>
          <ul aria-label="Plantas" className="flex flex-col gap-0.5">
            {levels.map((l) => {
              const on = l.id === activeId
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    aria-current={on ? 'true' : undefined}
                    onClick={() => onPick(l.id)}
                    className={cx(
                      'focus-ring flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-[15px] transition-colors duration-150 ease-out',
                      on ? 'bg-brand-wash font-semibold text-ink' : 'text-ink hover:bg-ink/5',
                    )}
                  >
                    <Layers
                      aria-hidden="true"
                      className={cx('size-[18px]', on ? 'text-brand' : 'text-ink-muted')}
                    />
                    <span className="flex-1 truncate">{l.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {canAdd && (
            <button
              type="button"
              aria-busy={adding || undefined}
              disabled={adding}
              onClick={onAdd}
              className="focus-ring mt-1 flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-[15px] font-medium text-brand transition-colors duration-150 ease-out hover:bg-brand-wash disabled:cursor-wait disabled:opacity-60"
            >
              <Plus aria-hidden="true" className="size-[18px]" strokeWidth={2.25} />
              Agregar planta
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Ambientes de la planta con su superficie; el elegido queda marcado. */
export function ZoneList({
  zones,
  selectedId,
  onPick,
  disabled,
}: {
  zones: readonly ZoneRow[]
  selectedId: string | null
  onPick: (id: string) => void
  disabled?: boolean
}) {
  if (zones.length === 0) {
    return (
      <p className="px-1.5 pb-1 pt-0.5 text-[13px] leading-snug text-ink-muted">
        Todavía no hay ambientes. Marca uno con Estructura › Ambiente.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {zones.map((z) => {
        const on = z.id === selectedId
        return (
          <li key={z.id}>
            <button
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onPick(z.id)}
              className={cx(
                'focus-ring flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 text-[15px] transition-colors duration-150 ease-out disabled:cursor-default',
                on ? 'bg-brand-wash font-semibold text-ink' : 'text-ink hover:bg-ink/5',
              )}
            >
              <SquareDashed
                aria-hidden="true"
                className={cx('size-[19px] shrink-0', on ? 'text-brand' : 'text-ink-muted')}
                strokeWidth={1.9}
              />
              <span className="min-w-0 flex-1 truncate text-left">{z.name}</span>
              <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-ink-muted">{z.area}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Panel izquierdo del modo Editar y del modo Ver: planta activa + ambientes con sus m². */
export function LevelPanel({
  picker,
  zones,
}: {
  picker: ComponentProps<typeof LevelPicker>
  zones: ComponentProps<typeof ZoneList>
}) {
  return (
    <aside
      aria-label="Nivel y ambientes"
      className={cx(FLOAT, 'absolute left-5 top-[88px] z-10 w-[268px] rounded-[26px] p-3.5')}
    >
      <LevelPicker {...picker} />
      <h2 className="px-1.5 pb-1.5 pt-4 text-xs font-semibold text-ink-muted">Ambientes</h2>
      <ZoneList {...zones} />
    </aside>
  )
}
