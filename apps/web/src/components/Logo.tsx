type Props = { size?: number; showName?: boolean; className?: string }

/** Logo de la marca (`/logo.svg`). Con `showName` lleva al lado el nombre; sin él es decorativo. */
export function Logo({ size = 36, showName = false, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-[17px] font-medium tracking-[-0.01em] ${className}`}>
      <img alt="" aria-hidden className="shrink-0" height={size} src="/logo.svg" width={size} />
      {showName && <span>Interiores 3D</span>}
    </span>
  )
}
