import { Check, type LucideIcon, TriangleAlert, WifiOff } from 'lucide-react'
import { type ReactNode, useId } from 'react'
import { Loader } from '@/components/Loader'
import { cx } from '@/lib/cx'
import { Badge, FLOAT } from './primitives'

export type SaveState =
  | 'guardado'
  | 'guardando'
  | 'sin-cambios'
  | 'sin-conexion'
  | 'conflicto'
  | 'sin-guardar'

const CHIP =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap'

function Chip({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span data-testid="save-status" role="status" className={cx(CHIP, tone)}>
      {children}
    </span>
  )
}

/** Chip de estado de guardado: color + ícono + texto, nunca solo color. */
export function SaveChip({ state }: { state: SaveState }) {
  switch (state) {
    case 'guardado':
      return (
        <Chip tone="bg-[#E1F5EB] text-ok">
          <span className="grid size-4 place-items-center rounded-full bg-ok-dot" aria-hidden="true">
            <Check className="size-3 text-white" strokeWidth={3.5} />
          </span>
          Guardado
        </Chip>
      )
    case 'guardando':
      return (
        <Chip tone="shell-chip-loader bg-ink/6 py-0 pl-2 text-ink">
          <Loader size="sm" inline label="Guardando…" />
        </Chip>
      )
    case 'sin-cambios':
      return (
        <Chip tone="bg-ink/6 text-ink-muted">
          <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
          Sin cambios
        </Chip>
      )
    case 'sin-conexion':
      return (
        <Chip tone="bg-[#FFF1D6] text-sun-ink">
          <WifiOff aria-hidden="true" className="size-4" strokeWidth={2.25} />
          Sin conexión
        </Chip>
      )
    case 'conflicto':
      return (
        <Chip tone="bg-danger-wash text-danger-ink">
          <TriangleAlert aria-hidden="true" className="size-4" strokeWidth={2.25} />
          Conflicto con otra pestaña
        </Chip>
      )
    case 'sin-guardar':
      return (
        <Chip tone="bg-danger-wash text-danger-ink">
          <TriangleAlert aria-hidden="true" className="size-4" strokeWidth={2.25} />
          Sin guardar
        </Chip>
      )
  }
}

/** Botón deshabilitado con insignia "Pronto" y la etiqueta "Llega en una próxima versión" (cursor o foco del teclado). */
export function SoonButton({
  icon: Icon,
  label,
  tone = 'glass',
  className,
}: {
  icon: LucideIcon
  label: string
  tone?: 'glass' | 'primary'
  className?: string
}) {
  const tipId = useId()
  return (
    <span
      className={cx('shell-soon relative inline-flex', className)}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: el contenedor recibe el foco porque el botón deshabilitado no puede.
      tabIndex={0}
      aria-describedby={tipId}
    >
      <button
        type="button"
        disabled
        className={cx(
          'pointer-events-none inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold',
          tone === 'glass' ? cx(FLOAT, 'text-ink/45') : 'bg-sky text-ink/55',
        )}
      >
        <Icon aria-hidden="true" className="size-[18px]" strokeWidth={2} />
        {label}
      </button>
      <Badge className="absolute -right-2 -top-2.5 shadow-[0_1px_2px_rgb(11_31_77/0.12)]">Pronto</Badge>
      <span
        id={tipId}
        role="tooltip"
        className="shell-tip absolute bottom-full right-0 z-30 mb-5 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgb(11_31_77/0.08),0_10px_28px_rgb(11_31_77/0.16)]"
      >
        Llega en una próxima versión
      </span>
    </span>
  )
}
