import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/** Todo lo que flota sobre el lienzo: vidrio, sombra de dos capas y clics solo dentro de la pieza (`editor-shell.css`). */
export const FLOAT = 'glass shell-float'

/** Marco de los paneles que se abren a la izquierda (Muebles, Materiales): entre la barra superior y el dock. */
export const SIDE_PANEL = 'absolute bottom-[96px] left-5 top-[88px] z-10 flex w-[356px] flex-col rounded-[26px] p-4'

/** Botón de píldora dentro de un selector: activo en azul noche con texto blanco, inactivo en vidrio. */
export function SegButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'focus-ring inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors duration-150 ease-out',
        active ? 'bg-ink text-white' : 'text-ink hover:bg-ink/6',
      )}
    >
      <Icon aria-hidden="true" className="size-[18px]" strokeWidth={2} />
      {label}
    </button>
  )
}

export type SegItem<T extends string> = { id: T; icon: LucideIcon; label: string }

/** Selector de píldoras (Ver | Editar, 2D | 3D | Ambas). `value` nulo = ninguna activa. */
export function Segmented<T extends string>({
  label,
  items,
  value,
  onChange,
  className,
}: {
  label: string
  items: readonly SegItem<T>[]
  value: T | null
  onChange?: (id: T) => void
  className?: string
}) {
  return (
    <fieldset
      className={cx(FLOAT, 'm-0 flex h-14 min-w-0 items-center gap-1 rounded-full border-0 p-1.5', className)}
    >
      <legend className="sr-only">{label}</legend>
      {items.map((it) => (
        <SegButton
          key={it.id}
          icon={it.icon}
          label={it.label}
          active={it.id === value}
          onClick={() => onChange?.(it.id)}
        />
      ))}
    </fieldset>
  )
}

/** Insignia ámbar suave: "Pronto". El texto va en tinta oscura, nunca en Sol. */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex h-5 shrink-0 items-center rounded-full bg-[#FFE7B8] px-2 text-[11px] font-semibold leading-none text-sun-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Fila de opciones de las que una está activa: grupo con leyenda para lectores de pantalla y botones `aria-pressed`. */
export function ChipRow({
  title,
  chips,
  active,
  onPick,
}: {
  title: string
  chips: readonly { value: string; label: string }[]
  active: string
  onPick: (value: string) => void
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap gap-x-2 gap-y-2.5 border-0 p-0">
      <legend className="sr-only">{title}</legend>
      {chips.map((c) => {
        const on = c.value === active
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(c.value)}
            className={cx(
              'focus-ring shell-hit h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150 ease-out',
              on
                ? 'bg-ink text-white'
                : 'bg-white/80 text-ink shadow-[inset_0_0_0_1px_rgb(11_31_77/0.08)] hover:bg-white',
            )}
          >
            {c.label}
          </button>
        )
      })}
    </fieldset>
  )
}

/** Cuadro de ícono redondeado (encabezados de panel). */
export function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-11 shrink-0 place-items-center rounded-[14px] bg-ink/6 text-ink',
        className,
      )}
    >
      <Icon className="size-[22px]" strokeWidth={1.9} />
    </span>
  )
}
