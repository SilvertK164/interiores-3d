import { APP_NAME } from '@/lib/ui-text'

type Props = { size?: number; showName?: boolean; className?: string }

/** Logo de la marca (`/logo.svg`). Con `showName` lleva al lado el nombre; sin él es decorativo. */
export function Logo({ size = 36, showName = false, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display text-[18px] font-bold tracking-[-0.02em] ${className}`}>
      <img alt="" aria-hidden className="shrink-0" height={size} src="/logo.svg" width={size} />
      {showName && <span>{APP_NAME}</span>}
    </span>
  )
}
