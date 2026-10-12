import type { LucideIcon } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react'
import { cx } from '@/lib/cx'
import { moveFocusOnKey } from './focus-nav'
import { FLOAT } from './primitives'

export type DockButton = { id: string; label: string; icon: LucideIcon; menu?: boolean; popup?: 'menu' | 'dialog' }

/** Barra de herramientas del modo Editar: botones de ≥ 44 px con ícono y etiqueta debajo; el menú abierto sale sobre su botón y las flechas, Inicio y Fin mueven el foco entre los botones. */
export function Dock({
  items,
  active,
  openMenu,
  onSelect,
  menus,
  className,
}: {
  items: readonly DockButton[]
  active: string | null
  openMenu: string | null
  onSelect: (id: string) => void
  menus?: Partial<Record<string, ReactNode>>
  className?: string
}) {
  return (
    <div className={className}>
      <div
        role="toolbar"
        aria-label="Herramientas de edición"
        data-frame-panel="bottom"
        onKeyDown={(event) => moveFocusOnKey(event, '[data-dock]', 'horizontal')}
        className={cx(FLOAT, 'flex items-center gap-1 rounded-[28px] p-2')}
      >
        {items.map((it) => {
          const on = it.id === active
          const open = openMenu === it.id
          return (
            <div key={it.id} className="relative">
              {open && menus?.[it.id]}
              <button
                type="button"
                data-dock={it.id}
                aria-pressed={on}
                aria-haspopup={it.menu ? (it.popup ?? 'menu') : undefined}
                aria-expanded={it.menu ? open : undefined}
                onClick={() => onSelect(it.id)}
                className={cx(
                  'focus-ring flex h-16 w-[84px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[20px] text-[12.5px] font-medium transition-colors duration-150 ease-out',
                  on ? 'bg-ink text-white' : 'text-ink hover:bg-ink/6',
                )}
              >
                <it.icon aria-hidden="true" className="size-[22px]" strokeWidth={1.9} />
                {it.label}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type MenuEntry = { id: string; label: string; icon: LucideIcon; active?: boolean; disabled?: boolean }

const ITEM = '[role="menuitem"]:not(:disabled)'

/** Menú emergente sobre un botón del dock: enfoca la primera entrada al abrirse, flechas/Inicio/Fin mueven el foco y Esc lo cierra. */
export function ToolMenu({
  title,
  entries,
  onPick,
  onClose,
}: {
  title: string
  entries: readonly MenuEntry[]
  onPick: (id: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(ITEM)?.focus()
  }, [])
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      return onClose()
    }
    moveFocusOnKey(event, ITEM, 'vertical')
  }
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={title}
      onKeyDown={onKeyDown}
      className={cx(FLOAT, 'absolute bottom-full left-1/2 z-20 mb-3 w-[236px] -translate-x-1/2 rounded-[24px] p-2.5')}
    >
      <p className="px-2.5 pb-1.5 pt-1 text-xs font-semibold text-ink-muted">{title}</p>
      {entries.map((e) => (
        <button
          key={e.id}
          type="button"
          role="menuitem"
          disabled={e.disabled}
          aria-current={e.active ? 'true' : undefined}
          onClick={() => onPick(e.id)}
          className={cx(
            'focus-ring flex h-11 w-full cursor-pointer items-center gap-3 rounded-[14px] px-2.5 text-left text-[15px] transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-45',
            e.active ? 'bg-brand-wash font-semibold text-ink' : 'text-ink hover:bg-ink/5',
          )}
        >
          <e.icon
            aria-hidden="true"
            className={cx('size-5 shrink-0', e.active ? 'text-brand' : 'text-ink-muted')}
            strokeWidth={1.9}
          />
          {e.label}
        </button>
      ))}
    </div>
  )
}
